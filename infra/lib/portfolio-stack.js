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
            environment: {
                AGENT_RUNTIME_URL: 'http://agent-runtime:8080', // Update this based on AgentCore setup
                NODE_ENV: 'production',
                // AWS_REGION is automatically set by Lambda runtime
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Grant Bedrock permissions to Chat Lambda
        chatLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeAgent',
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: ['*'], // In production, scope this to specific agent/model ARNs
        }));
        // Email Stub Lambda
        const emailLambda = new lambda.Function(this, 'EmailFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist/email')),
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
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
                allowedMethods: [lambda.HttpMethod.POST],
                allowedHeaders: ['Content-Type', 'Authorization'],
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
    }
}
exports.PortfolioStack = PortfolioStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydGZvbGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9ydGZvbGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBQzNELHdFQUEwRDtBQUMxRCx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLCtEQUFpRDtBQUNqRCx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLDJEQUE2QztBQUU3QywyQ0FBNkI7QUFNN0IsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTdCLHdEQUF3RDtRQUN4RCxtQ0FBbUM7UUFDbkMsd0RBQXdEO1FBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbEUsY0FBYyxFQUFFLDJCQUEyQjtZQUMzQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1lBQ3ZDLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxXQUFXLEVBQUUsb0JBQW9CO29CQUNqQyxhQUFhLEVBQUUsQ0FBQztpQkFDakI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILHdEQUF3RDtRQUN4RCxtQkFBbUI7UUFDbkIsd0RBQXdEO1FBRXhELHdCQUF3QjtRQUN4QixNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUMzRCxPQUFPLEVBQUUsTUFBTSxD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c0NBQXNDO1lBQ25ELFVBQVUsRUFBRSx5QkFBeUI7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxZQUFZLENBQUMsc0JBQXNCLEVBQUU7WUFDOUYsV0FBVyxFQUFFLGFBQWE7WUFDMUIsVUFBVSxFQUFFLHVCQUF1QjtTQUNwQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEzUEQsd0NBMlBDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBvcnRmb2xpb1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQb3J0Zm9saW9TdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBQb3J0Zm9saW9TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGRvbWFpbk5hbWUgfSA9IHByb3BzO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBFQ1IgUmVwb3NpdG9yeSBmb3IgQWdlbnQgUnVudGltZVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgYWdlbnRSZXBvc2l0b3J5ID0gbmV3IGVjci5SZXBvc2l0b3J5KHRoaXMsICdBZ2VudFJlcG9zaXRvcnknLCB7XG4gICAgICByZXBvc2l0b3J5TmFtZTogJ2NsYXlwYWx1bWJvLWFnZW50LXJ1bnRpbWUnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnS2VlcCBsYXN0IDUgaW1hZ2VzJyxcbiAgICAgICAgICBtYXhJbWFnZUNvdW50OiA1LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvLyBDaGF0IFN0cmVhbWluZyBMYW1iZGFcbiAgICBjb25zdCBjaGF0TGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ2hhdEZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2JhY2tlbmQvZGlzdC9jaGF0JykpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKSxcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIEFHRU5UX1JVTlRJTUVfVVJMOiAnaHR0cDovL2FnZW50LXJ1bnRpbWU6ODA4MCcsIC8vIFVwZGF0ZSB0aGlzIGJhc2VkIG9uIEFnZW50Q29yZSBzZXR1cFxuICAgICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAvLyBBV1NfUkVHSU9OIGlzIGF1dG9tYXRpY2FsbHkgc2V0IGJ5IExhbWJkYSBydW50aW1lXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBCZWRyb2NrIHBlcm1pc3Npb25zIHRvIENoYXQgTGFtYmRhXG4gICAgY2hhdExhbWJkYS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdiZWRyb2NrOkludm9rZUFnZW50JyxcbiAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBJbiBwcm9kdWN0aW9uLCBzY29wZSB0aGlzIHRvIHNwZWNpZmljIGFnZW50L21vZGVsIEFSTnNcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEVtYWlsIFN0dWIgTGFtYmRhXG4gICAgY29uc3QgZW1haWxMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdFbWFpbEZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2JhY2tlbmQvZGlzdC9lbWFpbCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMYW1iZGEgcGVybWlzc2lvbnMgdG8gcmVhZCBmcm9tIEVDUiAoaWYgbmVlZGVkIGZvciBwdWxsaW5nIGFnZW50IGltYWdlKVxuICAgIGFnZW50UmVwb3NpdG9yeS5ncmFudFB1bGwoY2hhdExhbWJkYSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIENPUlMgQ29uZmlndXJhdGlvblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3QgYWxsb3dlZE9yaWdpbnMgPSBbJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MyddO1xuICAgIGlmIChkb21haW5OYW1lKSB7XG4gICAgICBhbGxvd2VkT3JpZ2lucy5wdXNoKGBodHRwczovLyR7ZG9tYWluTmFtZX1gKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgTGFtYmRhIEZ1bmN0aW9uIFVSTCBmb3Igc3RyZWFtaW5nIHN1cHBvcnRcbiAgICBjb25zdCBjaGF0RnVuY3Rpb25VcmwgPSBjaGF0TGFtYmRhLmFkZEZ1bmN0aW9uVXJsKHtcbiAgICAgIGF1dGhUeXBlOiBsYW1iZGEuRnVuY3Rpb25VcmxBdXRoVHlwZS5OT05FLFxuICAgICAgY29yczoge1xuICAgICAgICBhbGxvd2VkT3JpZ2luczogYWxsb3dlZE9yaWdpbnMsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbbGFtYmRhLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgfSxcbiAgICAgIGludm9rZU1vZGU6IGxhbWJkYS5JbnZva2VNb2RlLlJFU1BPTlNFX1NUUkVBTSwgLy8gRW5hYmxlIHN0cmVhbWluZyFcbiAgICB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQVBJIEdhdGV3YXkgSFRUUCBBUElcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgY29uc3QgaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ1BvcnRmb2xpb0FwaScsIHtcbiAgICAgIGFwaU5hbWU6ICdjbGF5cGFsdW1iby1wb3J0Zm9saW8tYXBpJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBDbGF5IFBhbHVtYm8gUG9ydGZvbGlvIEFnZW50JyxcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhbGxvd2VkT3JpZ2lucyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULCBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLk9QVElPTlNdLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ2hhdCBzdHJlYW1pbmcgZW5kcG9pbnRcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9jaGF0L3N0cmVhbScsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDaGF0SW50ZWdyYXRpb24nLCBjaGF0TGFtYmRhKSxcbiAgICB9KTtcblxuICAgIC8vIEVtYWlsIGVuZHBvaW50XG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9hcGkvZW1haWwvc2VuZCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdFbWFpbEludGVncmF0aW9uJywgZW1haWxMYW1iZGEpLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBTMyBCdWNrZXQgZm9yIEZyb250ZW5kXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGNsYXlwYWx1bWJvLXBvcnRmb2xpby1mcm9udGVuZGAsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBQ00gQ2VydGlmaWNhdGUgKG9ubHkgaWYgZG9tYWluIGNvbmZpZ3VyZWQpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBsZXQgaG9zdGVkWm9uZTogcm91dGU1My5JSG9zdGVkWm9uZSB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY2VydGlmaWNhdGU6IGFjbS5JQ2VydGlmaWNhdGUgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAoZG9tYWluTmFtZSkge1xuICAgICAgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgfSk7XG5cbiAgICAgIGNlcnRpZmljYXRlID0gbmV3IGFjbS5DZXJ0aWZpY2F0ZSh0aGlzLCAnQ2VydGlmaWNhdGUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkoXG4gICAgICB0aGlzLFxuICAgICAgJ09yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIHtcbiAgICAgICAgY29tbWVudDogYE9BSSBmb3IgJHtkb21haW5OYW1lIHx8ICdjbGF5cGFsdW1iby1wb3J0Zm9saW8nfWAsXG4gICAgICB9XG4gICAgKTtcblxuICAgIGZyb250ZW5kQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb25Db25maWc6IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uUHJvcHMgPSB7XG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbihmcm9udGVuZEJ1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIG1pbmltdW1Qcm90b2NvbFZlcnNpb246IGNsb3VkZnJvbnQuU2VjdXJpdHlQb2xpY3lQcm90b2NvbC5UTFNfVjFfMl8yMDIxLFxuICAgICAgaHR0cFZlcnNpb246IGNsb3VkZnJvbnQuSHR0cFZlcnNpb24uSFRUUDJfQU5EXzMsXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxuICAgICAgLy8gQWRkIGN1c3RvbSBkb21haW4gY29uZmlndXJhdGlvbiBpZiBkb21haW4gaXMgc3BlY2lmaWVkXG4gICAgICAuLi4oZG9tYWluTmFtZSAmJiBjZXJ0aWZpY2F0ZSA/IHtcbiAgICAgICAgZG9tYWluTmFtZXM6IFtkb21haW5OYW1lXSxcbiAgICAgICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxuICAgICAgfSA6IHt9KSxcbiAgICB9O1xuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdEaXN0cmlidXRpb24nLCBkaXN0cmlidXRpb25Db25maWcpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBSb3V0ZSA1MyBSZWNvcmRzIChvbmx5IGlmIGRvbWFpbiBjb25maWd1cmVkKVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgaWYgKGRvbWFpbk5hbWUgJiYgaG9zdGVkWm9uZSkge1xuICAgICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKSksXG4gICAgICB9KTtcblxuICAgICAgbmV3IHJvdXRlNTMuQWFhYVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmRJUHY2Jywge1xuICAgICAgICB6b25lOiBob3N0ZWRab25lLFxuICAgICAgICByZWNvcmROYW1lOiBkb21haW5OYW1lLFxuICAgICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KGRpc3RyaWJ1dGlvbikpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPdXRwdXRzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGh0dHBBcGkuYXBpRW5kcG9pbnQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9BcGlVcmwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1N0cmVhbWluZ0FwaVVybCcsIHtcbiAgICAgIHZhbHVlOiBjaGF0RnVuY3Rpb25VcmwudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgRnVuY3Rpb24gVVJMIGZvciBzdHJlYW1pbmcgY2hhdCAoU1NFKScsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9TdHJlYW1pbmdBcGlVcmwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rpc3RyaWJ1dGlvbklkJywge1xuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxuICAgICAgZXhwb3J0TmFtZTogJ0NsYXlQYWx1bWJvRGlzdHJpYnV0aW9uSWQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Zyb250ZW5kQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBTMyBidWNrZXQgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9Gcm9udGVuZEJ1Y2tldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWdlbnRSZXBvc2l0b3J5VXJpJywge1xuICAgICAgdmFsdWU6IGFnZW50UmVwb3NpdG9yeS5yZXBvc2l0b3J5VXJpLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1IgcmVwb3NpdG9yeSBVUkkgZm9yIGFnZW50IHJ1bnRpbWUnLFxuICAgICAgZXhwb3J0TmFtZTogJ0NsYXlQYWx1bWJvQWdlbnRSZXBvVXJpJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJzaXRlVXJsJywge1xuICAgICAgdmFsdWU6IGRvbWFpbk5hbWUgPyBgaHR0cHM6Ly8ke2RvbWFpbk5hbWV9YCA6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnLFxuICAgICAgZXhwb3J0TmFtZTogJ0NsYXlQYWx1bWJvV2Vic2l0ZVVybCcsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==