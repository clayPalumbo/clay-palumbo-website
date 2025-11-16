# AWS Bedrock Setup Guide

This portfolio uses **AWS Bedrock** (not Anthropic's API directly) for the AI agent. Here's how to set it up:

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured
3. **Access to us-east-1 region** (or update the region in configuration)

## Step 1: Enable Bedrock Model Access

AWS Bedrock requires you to request access to specific models before using them.

### Via AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **Amazon Bedrock** service
3. In the left sidebar, click **Model access**
4. Click **Request model access** (or **Modify model access**)
5. Find **Anthropic** in the list
6. Check the box for **Claude 3.5 Sonnet** (model ID: `us.anthropic.claude-3-5-sonnet-20241022-v1:0`)
7. Review and submit the request
8. Wait for approval (usually instant for most accounts)

### Via AWS CLI

```bash
# Check current model access
aws bedrock list-foundation-models --region us-east-1

# Request access (if needed, via console is easier)
```

## Step 2: Verify IAM Permissions

Your Lambda execution role needs permissions to invoke Bedrock models. The CDK stack already includes this:

```typescript
chatLambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      'bedrock:InvokeAgent',
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ],
    resources: ['*'],
  })
);
```

## Step 3: Test Bedrock Access

Before deploying, test that you can invoke Bedrock:

```bash
# Test via AWS CLI
aws bedrock-runtime invoke-model \
  --region us-east-1 \
  --model-id us.anthropic.claude-3-5-sonnet-20241022-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  output.txt

cat output.txt
```

If this works, you're ready to deploy!

## Step 4: Deploy the Agent

The agent runtime uses Strands' `BedrockModel` which automatically handles authentication via IAM:

```python
from strands.models import BedrockModel

model = BedrockModel(
    model_id="us.anthropic.claude-3-5-sonnet-20241022-v1:0"
)
```

No API keys needed! The agent uses:
- **IAM role** when running in AgentCore/Lambda
- **~/.aws/credentials** when running locally

## Local Development

When testing locally, the agent will use your AWS credentials:

```bash
cd agent-runtime
export AWS_REGION=us-east-1
python agent.py
```

Make sure your local AWS credentials have Bedrock permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

## Supported Models

The agent is configured to use Claude 3.5 Sonnet, but you can easily change the model:

```python
# In agent-runtime/agent.py
MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v1:0"  # Current

# Alternative models:
# MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"     # Claude 3 Sonnet
# MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"      # Claude 3 Haiku
# MODEL_ID = "us.anthropic.claude-3-7-sonnet-20250219-v1:0" # Claude 3.7 Sonnet (if available)
```

Make sure to request access for any model you want to use!

## Cost Considerations

Bedrock pricing (as of 2025):
- **Claude 3.5 Sonnet**: ~$3/million input tokens, ~$15/million output tokens
- Typical conversation: 1,000-3,000 tokens
- **Estimated cost**: $0.01-0.05 per conversation

For a personal portfolio with moderate traffic:
- 100 conversations/day = ~$1-5/day
- 3,000 conversations/month = ~$30-150/month

## Troubleshooting

### Error: "Access Denied"

- **Cause**: Model access not enabled
- **Fix**: Go to AWS Console > Bedrock > Model access and request access

### Error: "Model not found"

- **Cause**: Wrong model ID or region
- **Fix**: Verify model ID and ensure you're in the correct region (us-east-1)

### Error: "Throttling exception"

- **Cause**: Exceeded rate limits
- **Fix**: Request quota increase or add retry logic

### Local development not working

- **Cause**: AWS credentials not configured
- **Fix**: Run `aws configure` or check `~/.aws/credentials`

## Comparison: Bedrock vs Anthropic Direct

| Feature | Bedrock | Anthropic API |
|---------|---------|---------------|
| **Authentication** | IAM role (no keys) | API key required |
| **Billing** | AWS account | Separate Anthropic account |
| **Integration** | Native AWS services | External API |
| **Rate Limits** | AWS quotas | Anthropic limits |
| **Latency** | Low (AWS region) | Varies |
| **Best For** | AWS-native apps | Multi-cloud / external |

For this portfolio (already using AWS infrastructure), **Bedrock is the better choice**.

## Next Steps

1. ✅ Enable Bedrock model access
2. ✅ Deploy the infrastructure
3. ✅ Build and push agent image
4. ✅ Test the chat interface
5. Monitor usage in AWS Cost Explorer

## Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude Models on Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html)
- [Strands Bedrock Integration](https://github.com/aws/bedrock-agentcore-starter-toolkit)
