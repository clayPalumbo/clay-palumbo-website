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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydGZvbGlvLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9ydGZvbGlvLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBQzNELHdFQUEwRDtBQUMxRCx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLCtEQUFpRDtBQUNqRCx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLDJEQUE2QztBQUU3QywyQ0FBNkI7QUFNN0IsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTdCLHdEQUF3RDtRQUN4RCxtQ0FBbUM7UUFDbkMsd0RBQXdEO1FBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDbEUsY0FBYyxFQUFFLDJCQUEyQjtZQUMzQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1lBQ3ZDLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxXQUFXLEVBQUUsb0JBQW9CO29CQUNqQyxhQUFhLEVBQUUsQ0FBQztpQkFDakI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILHdEQUF3RDtRQUN4RCxtQkFBbUI7UUFDbkIsd0RBQXdEO1FBRXhELHdCQUF3QjtRQUN4QixNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUMzRCxPQUFPLEVBQUUsTUFBTSxD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QkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsZUFBZSxDQUFDLGFBQWE7WUFDcEMsV0FBVyxFQUFFLHNDQUFzQztZQUNuRCxVQUFVLEVBQUUseUJBQXlCO1NBQ3RDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLFdBQVcsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsWUFBWSxDQUFDLHNCQUFzQixFQUFFO1lBQzlGLFdBQVcsRUFBRSxhQUFhO1lBQzFCLFVBQVUsRUFBRSx1QkFBdUI7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNVBELHdDQTRQQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBlY3IgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBQb3J0Zm9saW9TdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBkb21haW5OYW1lPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgUG9ydGZvbGlvU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUG9ydGZvbGlvU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBkb21haW5OYW1lIH0gPSBwcm9wcztcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gRUNSIFJlcG9zaXRvcnkgZm9yIEFnZW50IFJ1bnRpbWVcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGFnZW50UmVwb3NpdG9yeSA9IG5ldyBlY3IuUmVwb3NpdG9yeSh0aGlzLCAnQWdlbnRSZXBvc2l0b3J5Jywge1xuICAgICAgcmVwb3NpdG9yeU5hbWU6ICdjbGF5cGFsdW1iby1hZ2VudC1ydW50aW1lJyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0tlZXAgbGFzdCA1IGltYWdlcycsXG4gICAgICAgICAgbWF4SW1hZ2VDb3VudDogNSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIExhbWJkYSBGdW5jdGlvbnNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gQ2hhdCBTdHJlYW1pbmcgTGFtYmRhXG4gICAgY29uc3QgY2hhdExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NoYXRGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Rpc3QvY2hhdCcpKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBBR0VOVF9SVU5USU1FX1VSTDogJ2h0dHA6Ly9hZ2VudC1ydW50aW1lOjgwODAnLCAvLyBVcGRhdGUgdGhpcyBiYXNlZCBvbiBBZ2VudENvcmUgc2V0dXBcbiAgICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgLy8gQVdTX1JFR0lPTiBpcyBhdXRvbWF0aWNhbGx5IHNldCBieSBMYW1iZGEgcnVudGltZVxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgQmVkcm9jayBwZXJtaXNzaW9ucyB0byBDaGF0IExhbWJkYVxuICAgIGNoYXRMYW1iZGEuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnYmVkcm9jazpJbnZva2VBZ2VudCcsXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gSW4gcHJvZHVjdGlvbiwgc2NvcGUgdGhpcyB0byBzcGVjaWZpYyBhZ2VudC9tb2RlbCBBUk5zXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBFbWFpbCBTdHViIExhbWJkYVxuICAgIGNvbnN0IGVtYWlsTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRW1haWxGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9iYWNrZW5kL2Rpc3QvZW1haWwnKSksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgfSxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgTGFtYmRhIHBlcm1pc3Npb25zIHRvIHJlYWQgZnJvbSBFQ1IgKGlmIG5lZWRlZCBmb3IgcHVsbGluZyBhZ2VudCBpbWFnZSlcbiAgICBhZ2VudFJlcG9zaXRvcnkuZ3JhbnRQdWxsKGNoYXRMYW1iZGEpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDT1JTIENvbmZpZ3VyYXRpb25cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGFsbG93ZWRPcmlnaW5zID0gWydodHRwOi8vbG9jYWxob3N0OjUxNzMnXTtcbiAgICBpZiAoZG9tYWluTmFtZSkge1xuICAgICAgYWxsb3dlZE9yaWdpbnMucHVzaChgaHR0cHM6Ly8ke2RvbWFpbk5hbWV9YCk7XG4gICAgfVxuXG4gICAgLy8gQWRkIExhbWJkYSBGdW5jdGlvbiBVUkwgZm9yIHN0cmVhbWluZyBzdXBwb3J0XG4gICAgY29uc3QgY2hhdEZ1bmN0aW9uVXJsID0gY2hhdExhbWJkYS5hZGRGdW5jdGlvblVybCh7XG4gICAgICBhdXRoVHlwZTogbGFtYmRhLkZ1bmN0aW9uVXJsQXV0aFR5cGUuTk9ORSxcbiAgICAgIGNvcnM6IHtcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IGFsbG93ZWRPcmlnaW5zLFxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW2xhbWJkYS5IdHRwTWV0aG9kLkFMTF0sIC8vIEFsbG93IGFsbCBtZXRob2RzIGluY2x1ZGluZyBPUFRJT05TXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSwgLy8gQWxsb3cgYWxsIGhlYWRlcnMgZm9yIFNTRSBzdHJlYW1pbmdcbiAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFsnKiddLCAvLyBFeHBvc2UgYWxsIGhlYWRlcnMgZm9yIFNTRSBzdHJlYW1pbmdcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgICB9LFxuICAgICAgaW52b2tlTW9kZTogbGFtYmRhLkludm9rZU1vZGUuUkVTUE9OU0VfU1RSRUFNLCAvLyBFbmFibGUgc3RyZWFtaW5nIVxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBUEkgR2F0ZXdheSBIVFRQIEFQSVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBjb25zdCBodHRwQXBpID0gbmV3IGFwaWdhdGV3YXkuSHR0cEFwaSh0aGlzLCAnUG9ydGZvbGlvQXBpJywge1xuICAgICAgYXBpTmFtZTogJ2NsYXlwYWx1bWJvLXBvcnRmb2xpby1hcGknLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIENsYXkgUGFsdW1ibyBQb3J0Zm9saW8gQWdlbnQnLFxuICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFsbG93ZWRPcmlnaW5zLFxuICAgICAgICBhbGxvd01ldGhvZHM6IFthcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLlBPU1QsIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuT1BUSU9OU10sXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDaGF0IHN0cmVhbWluZyBlbmRwb2ludFxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvYXBpL2NoYXQvc3RyZWFtJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NoYXRJbnRlZ3JhdGlvbicsIGNoYXRMYW1iZGEpLFxuICAgIH0pO1xuXG4gICAgLy8gRW1haWwgZW5kcG9pbnRcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9lbWFpbC9zZW5kJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0VtYWlsSW50ZWdyYXRpb24nLCBlbWFpbExhbWJkYSksXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgRnJvbnRlbmRcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGZyb250ZW5kQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRnJvbnRlbmRCdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgY2xheXBhbHVtYm8tcG9ydGZvbGlvLWZyb250ZW5kYCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFDTSBDZXJ0aWZpY2F0ZSAob25seSBpZiBkb21haW4gY29uZmlndXJlZClcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGxldCBob3N0ZWRab25lOiByb3V0ZTUzLklIb3N0ZWRab25lIHwgdW5kZWZpbmVkO1xuICAgIGxldCBjZXJ0aWZpY2F0ZTogYWNtLklDZXJ0aWZpY2F0ZSB8IHVuZGVmaW5lZDtcblxuICAgIGlmIChkb21haW5OYW1lKSB7XG4gICAgICBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICB9KTtcblxuICAgICAgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluTmFtZSxcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDbG91ZEZyb250IERpc3RyaWJ1dGlvblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eShcbiAgICAgIHRoaXMsXG4gICAgICAnT3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAge1xuICAgICAgICBjb21tZW50OiBgT0FJIGZvciAke2RvbWFpbk5hbWUgfHwgJ2NsYXlwYWx1bWJvLXBvcnRmb2xpbyd9YCxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZnJvbnRlbmRCdWNrZXQuZ3JhbnRSZWFkKG9yaWdpbkFjY2Vzc0lkZW50aXR5KTtcblxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbkNvbmZpZzogY2xvdWRmcm9udC5EaXN0cmlidXRpb25Qcm9wcyA9IHtcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKGZyb250ZW5kQnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICAgIH0pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXG4gICAgICAgIGNvbXByZXNzOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgbWluaW11bVByb3RvY29sVmVyc2lvbjogY2xvdWRmcm9udC5TZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8yXzIwMjEsXG4gICAgICBodHRwVmVyc2lvbjogY2xvdWRmcm9udC5IdHRwVmVyc2lvbi5IVFRQMl9BTkRfMyxcbiAgICAgIHByaWNlQ2xhc3M6IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU18xMDAsXG4gICAgICAvLyBBZGQgY3VzdG9tIGRvbWFpbiBjb25maWd1cmF0aW9uIGlmIGRvbWFpbiBpcyBzcGVjaWZpZWRcbiAgICAgIC4uLihkb21haW5OYW1lICYmIGNlcnRpZmljYXRlID8ge1xuICAgICAgICBkb21haW5OYW1lczogW2RvbWFpbk5hbWVdLFxuICAgICAgICBjZXJ0aWZpY2F0ZTogY2VydGlmaWNhdGUsXG4gICAgICB9IDoge30pLFxuICAgIH07XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Rpc3RyaWJ1dGlvbicsIGRpc3RyaWJ1dGlvbkNvbmZpZyk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFJvdXRlIDUzIFJlY29yZHMgKG9ubHkgaWYgZG9tYWluIGNvbmZpZ3VyZWQpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBpZiAoZG9tYWluTmFtZSAmJiBob3N0ZWRab25lKSB7XG4gICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgcmVjb3JkTmFtZTogZG9tYWluTmFtZSxcbiAgICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHRhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pKSxcbiAgICAgIH0pO1xuXG4gICAgICBuZXcgcm91dGU1My5BYWFhUmVjb3JkKHRoaXMsICdBbGlhc1JlY29yZElQdjYnLCB7XG4gICAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICAgIHJlY29yZE5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKG5ldyB0YXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoZGlzdHJpYnV0aW9uKSksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIE91dHB1dHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogaHR0cEFwaS5hcGlFbmRwb2ludCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgZW5kcG9pbnQgVVJMJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDbGF5UGFsdW1ib0FwaVVybCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RyZWFtaW5nQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGNoYXRGdW5jdGlvblVybC51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBGdW5jdGlvbiBVUkwgZm9yIHN0cmVhbWluZyBjaGF0IChTU0UpJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDbGF5UGFsdW1ib1N0cmVhbWluZ0FwaVVybCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9EaXN0cmlidXRpb25JZCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IGZyb250ZW5kQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIFMzIGJ1Y2tldCBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6ICdDbGF5UGFsdW1ib0Zyb250ZW5kQnVja2V0JyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBZ2VudFJlcG9zaXRvcnlVcmknLCB7XG4gICAgICB2YWx1ZTogYWdlbnRSZXBvc2l0b3J5LnJlcG9zaXRvcnlVcmksXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUiByZXBvc2l0b3J5IFVSSSBmb3IgYWdlbnQgcnVudGltZScsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9BZ2VudFJlcG9VcmknLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYnNpdGVVcmwnLCB7XG4gICAgICB2YWx1ZTogZG9tYWluTmFtZSA/IGBodHRwczovLyR7ZG9tYWluTmFtZX1gIDogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiAnQ2xheVBhbHVtYm9XZWJzaXRlVXJsJyxcbiAgICB9KTtcbiAgfVxufVxuIl19