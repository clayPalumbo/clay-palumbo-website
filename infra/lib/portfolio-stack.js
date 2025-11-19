"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cloudwatchActions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const path = __importStar(require("path"));
class PortfolioStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { domainName } = props;
        // =====================================================
        // ECR Repository for Agent Runtime
        // =====================================================
        const agentRepository = new ecr.Repository(this, 'AgentRepository', {
            repositoryName: 'claypalumbo-agent-runtime',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lifecycleRules: [
                {
                    description: 'Keep last 5 images',
                    maxImageCount: 5,
                },
            ],
        });
        // =====================================================
        // Lambda Functions
        // =====================================================
        // Chat Streaming Lambda
        const chatLambda = new lambda.Function(this, 'ChatFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/chat')),
            timeout: cdk.Duration.seconds(300),
            memorySize: 512,
            // Note: No hard concurrency limit due to account limits
            // Cost protection provided by CloudWatch billing alarm at $40
            environment: {
                AGENT_RUNTIME_URL: 'http://agent-runtime:8080', // Update this based on AgentCore setup
                NODE_ENV: 'production',
                // AWS_REGION is automatically set by Lambda runtime
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Grant Bedrock permissions to Chat Lambda (models + knowledge base)
        chatLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeAgent',
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:Retrieve', // Knowledge Base retrieval
                'bedrock:RetrieveAndGenerate', // Alternative retrieval method
            ],
            resources: ['*'], // Covers all models and knowledge bases
        }));
        // Email Stub Lambda
        const emailLambda = new lambda.Function(this, 'EmailFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/email')),
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            // No concurrency limit - email is rarely used and cheap
            environment: {
                NODE_ENV: 'production',
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Grant Lambda permissions to read from ECR (if needed for pulling agent image)
        agentRepository.grantPull(chatLambda);
        // =====================================================
        // CORS Configuration
        // =====================================================
        const allowedOrigins = ['http://localhost:5173'];
        if (domainName) {
            allowedOrigins.push(`https://${domainName}`);
        }
        // Add Lambda Function URL for streaming support
        const chatFunctionUrl = chatLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: allowedOrigins,
                allowedMethods: [lambda.HttpMethod.ALL], // Allow all methods including OPTIONS
                allowedHeaders: ['*'], // Allow all headers for SSE streaming
                exposedHeaders: ['*'], // Expose all headers for SSE streaming
                maxAge: cdk.Duration.hours(1),
            },
            invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Enable streaming!
        });
        // =====================================================
        // API Gateway HTTP API
        // =====================================================
        const httpApi = new apigateway.HttpApi(this, 'PortfolioApi', {
            apiName: 'claypalumbo-portfolio-api',
            description: 'API for Clay Palumbo Portfolio Agent',
            corsPreflight: {
                allowOrigins: allowedOrigins,
                allowMethods: [apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.OPTIONS],
                allowHeaders: ['Content-Type', 'Authorization'],
                maxAge: cdk.Duration.hours(1),
            },
        });
        // Chat streaming endpoint
        // Note: Cost protection via CloudWatch billing alarm, not hard throttling
        httpApi.addRoutes({
            path: '/api/chat/stream',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('ChatIntegration', chatLambda),
        });
        // Email endpoint
        httpApi.addRoutes({
            path: '/api/email/send',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('EmailIntegration', emailLambda),
        });
        // =====================================================
        // S3 Bucket for Frontend
        // =====================================================
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `claypalumbo-portfolio-frontend`,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });
        // =====================================================
        // ACM Certificate (only if domain configured)
        // =====================================================
        let hostedZone;
        let certificate;
        if (domainName) {
            hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
                domainName: domainName,
            });
            certificate = new acm.Certificate(this, 'Certificate', {
                domainName: domainName,
                validation: acm.CertificateValidation.fromDns(hostedZone),
            });
        }
        // =====================================================
        // CloudFront Distribution
        // =====================================================
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: `OAI for ${domainName || 'claypalumbo-portfolio'}`,
        });
        frontendBucket.grantRead(originAccessIdentity);
        const distributionConfig = {
            defaultBehavior: {
                origin: new origins.S3Origin(frontendBucket, {
                    originAccessIdentity,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                compress: true,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(0),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(0),
                },
            ],
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            // Add custom domain configuration if domain is specified
            ...(domainName && certificate ? {
                domainNames: [domainName],
                certificate: certificate,
            } : {}),
        };
        const distribution = new cloudfront.Distribution(this, 'Distribution', distributionConfig);
        // =====================================================
        // Route 53 Records (only if domain configured)
        // =====================================================
        if (domainName && hostedZone) {
            new route53.ARecord(this, 'AliasRecord', {
                zone: hostedZone,
                recordName: domainName,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            });
            new route53.AaaaRecord(this, 'AliasRecordIPv6', {
                zone: hostedZone,
                recordName: domainName,
                target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            });
        }
        // =====================================================
        // Cost Monitoring & Alarms
        // =====================================================
        // SNS Topic for billing alerts (email subscription must be added manually)
        const billingAlertTopic = new sns.Topic(this, 'BillingAlertTopic', {
            displayName: 'Clay Palumbo Portfolio - Billing Alerts',
            topicName: 'claypalumbo-portfolio-billing-alerts',
        });
        // CloudWatch Alarm for estimated charges (triggers at $40 = 80% of $50 budget)
        const billingAlarm = new cloudwatch.Alarm(this, 'BillingAlarm', {
            alarmName: 'ClayPalumboPortfolio-BillingAlert-40USD',
            alarmDescription: 'Alert when estimated AWS charges exceed $40',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/Billing',
                metricName: 'EstimatedCharges',
                dimensionsMap: {
                    Currency: 'USD',
                },
                statistic: 'Maximum',
                period: cdk.Duration.hours(6),
            }),
            threshold: 40, // Alert at $40 (80% of $50 budget)
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });
        billingAlarm.addAlarmAction(new cloudwatchActions.SnsAction(billingAlertTopic));
        // Lambda throttle alarms
        const chatThrottleAlarm = new cloudwatch.Alarm(this, 'ChatLambdaThrottleAlarm', {
            alarmName: 'ClayPalumboPortfolio-ChatLambdaThrottles',
            alarmDescription: 'Alert when chat Lambda is being throttled due to concurrency limits',
            metric: chatLambda.metricThrottles({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            }),
            threshold: 10, // Alert if more than 10 throttles in 5 minutes
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        });
        chatThrottleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(billingAlertTopic));
        // =====================================================
        // Outputs
        // =====================================================
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: httpApi.apiEndpoint,
            description: 'API Gateway endpoint URL',
            exportName: 'ClayPalumboApiUrl',
        });
        new cdk.CfnOutput(this, 'StreamingApiUrl', {
            value: chatFunctionUrl.url,
            description: 'Lambda Function URL for streaming chat (SSE)',
            exportName: 'ClayPalumboStreamingApiUrl',
        });
        new cdk.CfnOutput(this, 'DistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront Distribution ID',
            exportName: 'ClayPalumboDistributionId',
        });
        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: frontendBucket.bucketName,
            description: 'Frontend S3 bucket name',
            exportName: 'ClayPalumboFrontendBucket',
        });
        new cdk.CfnOutput(this, 'AgentRepositoryUri', {
            value: agentRepository.repositoryUri,
            description: 'ECR repository URI for agent runtime',
            exportName: 'ClayPalumboAgentRepoUri',
        });
        new cdk.CfnOutput(this, 'WebsiteUrl', {
            value: domainName ? `https://${domainName}` : `https://${distribution.distributionDomainName}`,
            description: 'Website URL',
            exportName: 'ClayPalumboWebsiteUrl',
        });
        new cdk.CfnOutput(this, 'BillingAlertTopicArn', {
            value: billingAlertTopic.topicArn,
            description: 'SNS Topic ARN for billing alerts (subscribe your email)',
            exportName: 'ClayPalumboBillingAlertTopic',
        });
    }
}
exports.PortfolioStack = PortfolioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydGZvbGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9ydGZvbGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBQzNELHdFQUEwRDtBQUMxRCx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLCtEQUFpRDtBQUNqRCx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLDJEQUE2QztBQUM3Qyx1RUFBeUQ7QUFDekQsc0ZBQXdFO0FBQ3hFLHlEQUEyQztBQUczQywyQ0FBNkI7QUFNN0IsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTdCLHdEQUF3RDtRQUN4RCxtQ0FBbUM7UUFDbkMsd0RBQXdEO1FBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbEUsY0FBYyxFQUFFLDJCQUEyQjtZQUMzQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1lBQ3ZDLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxXQUFXLEVBQUUsb0JBQW9CO29CQUNqQyxhQUFhLEVBQUUsQ0FBQztpQkFDakI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILHdEQUF3RDtRQUN4RCxtQkFBbUI7UUFDbkIsd0RBQXdEO1FBRXhELHdCQUF3QjtRQUN4QixNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFB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InNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBlY3IgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xuaW1wb3J0ICogYXMgY2xvdWR3YXRjaEFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucyc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XG5pbXBvcnQgKiBhcyBzdWJzY3JpcHRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMtc3Vic2NyaXB0aW9ucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9ydGZvbGlvU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZG9tYWluTmFtZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFBvcnRmb2xpb1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFBvcnRmb2xpb1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZG9tYWluTmFtZSB9ID0gcHJvcHM7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEVDUiBSZXBvc2l0b3J5IGZvciBBZ2VudCBSdW50aW1lXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBhZ2VudFJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ0FnZW50UmVwb3NpdG9yeScsIHtcbiAgICAgIHJlcG9zaXRvcnlOYW1lOiAnY2xheXBhbHVtYm8tYWdlbnQtcnVudGltZScsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdLZWVwIGxhc3QgNSBpbWFnZXMnLFxuICAgICAgICAgIG1heEltYWdlQ291bnQ6IDUsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIENoYXQgU3RyZWFtaW5nIExhbWJkYVxuICAgIGNvbnN0IGNoYXRMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDaGF0RnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vYmFja2VuZC9kaXN0L2NoYXQnKSksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgLy8gTm90ZTogTm8gaGFyZCBjb25jdXJyZW5jeSBsaW1pdCBkdWUgdG8gYWNjb3VudCBsaW1pdHNcbiAgICAgIC8vIENvc3QgcHJvdGVjdGlvbiBwcm92aWRlZCBieSBDbG91ZFdhdGNoIGJpbGxpbmcgYWxhcm0gYXQgJDQwXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBBR0VOVF9SVU5USU1FX1VSTDogJ2h0dHA6Ly9hZ2VudC1ydW50aW1lOjgwODAnLCAvLyBVcGRhdGUgdGhpcyBiYXNlZCBvbiBBZ2VudENvcmUgc2V0dXBcbiAgICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgLy8gQVdTX1JFR0lPTiBpcyBhdXRvbWF0aWNhbGx5IHNldCBieSBMYW1iZGEgcnVudGltZVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgQmVkcm9jayBwZXJtaXNzaW9ucyB0byBDaGF0IExhbWJkYSAobW9kZWxzICsga25vd2xlZGdlIGJhc2UpXG4gICAgY2hhdExhbWJkYS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdiZWRyb2NrOkludm9rZUFnZW50JyxcbiAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgICAgICdiZWRyb2NrOlJldHJpZXZlJywgLy8gS25vd2xlZGdlIEJhc2UgcmV0cmlldmFsXG4gICAgICAgICAgJ2JlZHJvY2s6UmV0cmlldmVBbmRHZW5lcmF0ZScsIC8vIEFsdGVybmF0aXZlIHJldHJpZXZhbCBtZXRob2RcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQ292ZXJzIGFsbCBtb2RlbHMgYW5kIGtub3dsZWRnZSBiYXNlc1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gRW1haWwgU3R1YiBMYW1iZGFcbiAgICBjb25zdCBlbWFpbExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0VtYWlsRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vYmFja2VuZC9kaXN0L2VtYWlsJykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgLy8gTm8gY29uY3VycmVuY3kgbGltaXQgLSBlbWFpbCBpcyByYXJlbHkgdXNlZCBhbmQgY2hlYXBcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMYW1iZGEgcGVybWlzc2lvbnMgdG8gcmVhZCBmcm9tIEVDUiAoaWYgbmVlZGVkIGZvciBwdWxsaW5nIGFnZW50IGltYWdlKVxuICAgIGFnZW50UmVwb3NpdG9yeS5ncmFudFB1bGwoY2hhdExhbWJkYSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENPUlMgQ29uZmlndXJhdGlvblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgYWxsb3dlZE9yaWdpbnMgPSBbJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MyddO1xuICAgIGlmIChkb21haW5OYW1lKSB7XG4gICAgICBhbGxvd2VkT3JpZ2lucy5wdXNoKGBodHRwczovLyR7ZG9tYWluTmFtZX1gKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgTGFtYmRhIEZ1bmN0aW9uIFVSTCBmb3Igc3RyZWFtaW5nIHN1cHBvcnRcbiAgICBjb25zdCBjaGF0RnVuY3Rpb25VcmwgPSBjaGF0TGFtYmRhLmFkZEZ1bmN0aW9uVXJsKHtcbiAgICAgIGF1dGhUeXBlOiBsYW1iZGEuRnVuY3Rpb25VcmxBdXRoVHlwZS5OT05FLFxuICAgICAgY29yczoge1xuICAgICAgICBhbGxvd2VkT3JpZ2luczogYWxsb3dlZE9yaWdpbnMsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbbGFtYmRhLkh0dHBNZXRob2QuQUxMXSwgLy8gQWxsb3cgYWxsIG1ldGhvZHMgaW5jbHVkaW5nIE9QVElPTlNcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLCAvLyBBbGxvdyBhbGwgaGVhZGVycyBmb3IgU1NFIHN0cmVhbWluZ1xuICAgICAgICBleHBvc2VkSGVhZGVyczogWycqJ10sIC8vIEV4cG9zZSBhbGwgaGVhZGVycyBmb3IgU1NFIHN0cmVhbWluZ1xuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcbiAgICAgIH0sXG4gICAgICBpbnZva2VNb2RlOiBsYW1iZGEuSW52b2tlTW9kZS5SRVNQT05TRV9TVFJFQU0sIC8vIEVuYWJsZSBzdHJlYW1pbmchXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFQSSBHYXRld2F5IEhUVFAgQVBJXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGNvbnN0IGh0dHBBcGkgPSBuZXcgYXBpZ2F0ZXdheS5IdHRwQXBpKHRoaXMsICdQb3J0Zm9saW9BcGknLCB7XG4gICAgICBhcGlOYW1lOiAnY2xheXBhbHVtYm8tcG9ydGZvbGlvLWFwaScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBmb3IgQ2xheSBQYWx1bWJvIFBvcnRmb2xpbyBBZ2VudCcsXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYWxsb3dlZE9yaWdpbnMsXG4gICAgICAgIGFsbG93TWV0aG9kczogW2FwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUE9TVCwgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5PUFRJT05TXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENoYXQgc3RyZWFtaW5nIGVuZHBvaW50XG4gICAgLy8gTm90ZTogQ29zdCBwcm90ZWN0aW9uIHZpYSBDbG91ZFdhdGNoIGJpbGxpbmcgYWxhcm0sIG5vdCBoYXJkIHRocm90dGxpbmdcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9jaGF0L3N0cmVhbScsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDaGF0SW50ZWdyYXRpb24nLCBjaGF0TGFtYmRhKSxcbiAgICB9KTtcblxuICAgIC8vIEVtYWlsIGVuZHBvaW50XG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9hcGkvZW1haWwvc2VuZCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdFbWFpbEludGVncmF0aW9uJywgZW1haWxMYW1iZGEpLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTMyBCdWNrZXQgZm9yIEZyb250ZW5kXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGNsYXlwYWx1bWJvLXBvcnRmb2xpby1mcm9udGVuZGAsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBQ00gQ2VydGlmaWNhdGUgKG9ubHkgaWYgZG9tYWluIGNvbmZpZ3VyZWQpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBsZXQgaG9zdGVkWm9uZTogcm91dGU1My5JSG9zdGVkWm9uZSB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY2VydGlmaWNhdGU6IGFjbS5JQ2VydGlmaWNhdGUgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAoZG9tYWluTmFtZSkge1xuICAgICAgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgfSk7XG5cbiAgICAgIGNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkoXG4gICAgICB0aGlzLFxuICAgICAgJ09yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIHtcbiAgICAgICAgY29tbWVudDogYE9BSSBmb3IgJHtkb21haW5OYW1lIHx8ICdjbGF5cGFsdW1iby1wb3J0Zm9saW8nfWAsXG4gICAgICB9XG4gICAgKTtcblxuICAgIGZyb250ZW5kQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb25Db25maWc6IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uUHJvcHMgPSB7XG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbihmcm9udGVuZEJ1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIG1pbmltdW1Qcm90b2NvbFZlcnNpb246IGNsb3VkZnJvbnQuU2VjdXJpdHlQb2xpY3lQcm90b2NvbC5UTFNfVjFfMl8yMDIxLFxuICAgICAgaHR0cFZlcnNpb246IGNsb3VkZnJvbnQuSHR0cFZlcnNpb24uSFRUUDJfQU5EXzMsXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxuICAgICAgLy8gQWRkIGN1c3RvbSBkb21haW4gY29uZmlndXJhdGlvbiBpZiBkb21haW4gaXMgc3BlY2lmaWVkXG4gICAgICAuLi4oZG9tYWluTmFtZSAmJiBjZXJ0aWZpY2F0ZSA/IHtcbiAgICAgICAgZG9tYWluTmFtZXM6IFtkb21haW5OYW1lXSxcbiAgICAgICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxuICAgICAgfSA6IHt9KSxcbiAgICB9O1xuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCBkaXN0cmlidXRpb25Db25maWcpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBSb3V0ZSA1MyBSZWNvcmRzIChvbmx5IGlmIGRvbWFpbiBjb25maWd1cmVkKVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgaWYgKGRvbWFpbk5hbWUgJiYgaG9zdGVkWm9uZSkge1xuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKSksXG4gICAgICB9KTtcblxuICAgICAgbmV3IHJvdXRlNTMuQWFhYVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmRJUHY2Jywge1xuICAgICAgICB6b25lOiBob3N0ZWRab25lLFxuICAgICAgICByZWNvcmROYW1lOiBkb21haW5OYW1lLFxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KGRpc3RyaWJ1dGlvbikpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDb3N0IE1vbml0b3JpbmcgJiBBbGFybXNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gU05TIFRvcGljIGZvciBiaWxsaW5nIGFsZXJ0cyAoZW1haWwgc3Vic2NyaXB0aW9uIG11c3QgYmUgYWRkZWQgbWFudWFsbHkpXG4gICAgY29uc3QgYmlsbGluZ0FsZXJ0VG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdCaWxsaW5nQWxlcnRUb3BpYycsIHtcbiAgICAgIGRpc3BsYXlOYW1lOiAnQ2xheSBQYWx1bWJvIFBvcnRmb2xpbyAtIEJpbGxpbmcgQWxlcnRzJyxcbiAgICAgIHRvcGljTmFtZTogJ2NsYXlwYWx1bWJvLXBvcnRmb2xpby1iaWxsaW5nLWFsZXJ0cycsXG4gICAgfSk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIEFsYXJtIGZvciBlc3RpbWF0ZWQgY2hhcmdlcyAodHJpZ2dlcnMgYXQgJDQwID0gODAlIG9mICQ1MCBidWRnZXQpXG4gICAgY29uc3QgYmlsbGluZ0FsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0JpbGxpbmdBbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogJ0NsYXlQYWx1bWJvUG9ydGZvbGlvLUJpbGxpbmdBbGVydC00MFVTRCcsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBlc3RpbWF0ZWQgQVdTIGNoYXJnZXMgZXhjZWVkICQ0MCcsXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9CaWxsaW5nJyxcbiAgICAgICAgbWV0cmljTmFtZTogJ0VzdGltYXRlZENoYXJnZXMnLFxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XG4gICAgICAgICAgQ3VycmVuY3k6ICdVU0QnLFxuICAgICAgICB9LFxuICAgICAgICBzdGF0aXN0aWM6ICdNYXhpbXVtJyxcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoNiksXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogNDAsIC8vIEFsZXJ0IGF0ICQ0MCAoODAlIG9mICQ1MCBidWRnZXQpXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICB9KTtcblxuICAgIGJpbGxpbmdBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKGJpbGxpbmdBbGVydFRvcGljKSk7XG5cbiAgICAvLyBMYW1iZGEgdGhyb3R0bGUgYWxhcm1zXG4gICAgY29uc3QgY2hhdFRocm90dGxlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQ2hhdExhbWJkYVRocm90dGxlQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6ICdDbGF5UGFsdW1ib1BvcnRmb2xpby1DaGF0TGFtYmRhVGhyb3R0bGVzJyxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIGNoYXQgTGFtYmRhIGlzIGJlaW5nIHRocm90dGxlZCBkdWUgdG8gY29uY3VycmVuY3kgbGltaXRzJyxcbiAgICAgIG1ldHJpYzogY2hhdExhbWJkYS5tZXRyaWNUaHJvdHRsZXMoe1xuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgfSksXG4gICAgICB0aHJlc2hvbGQ6IDEwLCAvLyBBbGVydCBpZiBtb3JlIHRoYW4gMTAgdGhyb3R0bGVzIGluIDUgbWludXRlc1xuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXG4gICAgfSk7XG5cbiAgICBjaGF0VGhyb3R0bGVBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKGJpbGxpbmdBbGVydFRvcGljKSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE91dHB1dHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogaHR0cEFwaS5hcGlFbmRwb2ludCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgZW5kcG9pbnQgVVJMJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDbGF5UGFsdW1ib0FwaVVybCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RyZWFtaW5nQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGNoYXRGdW5jdGlvblVybC51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBGdW5jdGlvbiBVUkwgZm9yIHN0cmVhbWluZyBjaGF0IChTU0UpJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDbGF5UGFsdW1ib1N0cmVhbWluZ0FwaVVybCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9EaXN0cmlidXRpb25JZCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IGZyb250ZW5kQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIFMzIGJ1Y2tldCBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDbGF5UGFsdW1ib0Zyb250ZW5kQnVja2V0JyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBZ2VudFJlcG9zaXRvcnlVcmknLCB7XG4gICAgICB2YWx1ZTogYWdlbnRSZXBvc2l0b3J5LnJlcG9zaXRvcnlVcmksXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUiByZXBvc2l0b3J5IFVSSSBmb3IgYWdlbnQgcnVudGltZScsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9BZ2VudFJlcG9VcmknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogZG9tYWluTmFtZSA/IGBodHRwczovLyR7ZG9tYWluTmFtZX1gIDogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9XZWJzaXRlVXJsJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCaWxsaW5nQWxlcnRUb3BpY0FybicsIHtcbiAgICAgIHZhbHVlOiBiaWxsaW5nQWxlcnRUb3BpYy50b3BpY0FybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIFRvcGljIEFSTiBmb3IgYmlsbGluZyBhbGVydHMgKHN1YnNjcmliZSB5b3VyIGVtYWlsKScsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9CaWxsaW5nQWxlcnRUb3BpYycsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==