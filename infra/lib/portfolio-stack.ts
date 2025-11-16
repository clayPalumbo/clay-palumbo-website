import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface PortfolioStackProps extends cdk.StackProps {
  domainName?: string;
}

export class PortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PortfolioStackProps) {
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
    chatLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeAgent',
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'], // In production, scope this to specific agent/model ARNs
      })
    );

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
    let hostedZone: route53.IHostedZone | undefined;
    let certificate: acm.ICertificate | undefined;

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
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: `OAI for ${domainName || 'claypalumbo-portfolio'}`,
      }
    );

    frontendBucket.grantRead(originAccessIdentity);

    const distributionConfig: cloudfront.DistributionProps = {
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
