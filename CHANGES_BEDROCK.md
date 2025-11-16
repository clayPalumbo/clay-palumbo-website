# Changes Made: Anthropic → AWS Bedrock

This document summarizes the changes made to use AWS Bedrock instead of the Anthropic API directly.

## Files Changed

### 1. **agent-runtime/requirements.txt**
- ❌ Removed: `anthropic>=0.40.0`
- ✅ Added: `boto3>=1.34.0` and `botocore>=1.34.0`
- The agent now uses Bedrock via Strands' `BedrockModel` (which uses boto3 under the hood)

### 2. **agent-runtime/.env.example**
- ❌ Removed: `ANTHROPIC_API_KEY=your_api_key_here`
- ✅ Added: `AWS_REGION=us-east-1` and notes about IAM authentication
- No API key needed - uses AWS credentials

### 3. **agent-runtime/agent.py**
- ✅ Already using `BedrockModel` - no changes needed!
```python
from strands.models import BedrockModel
model = BedrockModel(model_id=MODEL_ID)
```

### 4. **infra/lib/portfolio-stack.ts**
- ✅ Added Bedrock permissions to Lambda IAM role:
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

### 5. **README.md**
- Updated all references from `ANTHROPIC_API_KEY` to AWS Bedrock
- Added link to [BEDROCK_SETUP.md](./BEDROCK_SETUP.md)
- Updated local development instructions
- Updated troubleshooting section

### 6. **deploy.sh**
- Updated deployment notes to mention Bedrock model access instead of API key
- Added reminder to enable Bedrock model access in AWS Console

### 7. **New Files**
- ✅ Created [BEDROCK_SETUP.md](./BEDROCK_SETUP.md) - Complete guide for enabling Bedrock

## Authentication Flow

### Before (Anthropic API)
```
Agent → ANTHROPIC_API_KEY → Anthropic API servers
```

### After (AWS Bedrock)
```
Agent → IAM Role → AWS Bedrock → Claude models
```

## Benefits of Using Bedrock

1. **No API keys to manage** - Uses IAM roles (more secure)
2. **Native AWS integration** - Works seamlessly with other AWS services
3. **Consolidated billing** - Everything in one AWS account
4. **Lower latency** - Regional endpoints
5. **Better compliance** - Data stays in AWS region

## What You Need to Do

1. **Enable Bedrock model access** in AWS Console:
   - Go to AWS Console → Bedrock → Model access
   - Request access to `us.anthropic.claude-3-5-sonnet-20241022-v1:0`
   - Usually approved instantly

2. **Remove any old environment variables**:
   ```bash
   # Old (delete these):
   unset ANTHROPIC_API_KEY

   # New (keep these):
   export AWS_REGION=us-east-1
   ```

3. **Deploy as normal**:
   ```bash
   ./deploy.sh
   ```

## Testing Bedrock Access

Before deploying, test that Bedrock works:

```bash
aws bedrock-runtime invoke-model \
  --region us-east-1 \
  --model-id us.anthropic.claude-3-5-sonnet-20241022-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  output.txt && cat output.txt
```

If this succeeds, you're good to go!

## Cost Comparison

Both services use similar pricing, but Bedrock bills through your AWS account:

| Service | Input Tokens | Output Tokens |
|---------|-------------|---------------|
| Anthropic API | ~$3/M | ~$15/M |
| AWS Bedrock | ~$3/M | ~$15/M |

*(Prices for Claude 3.5 Sonnet, as of 2025)*

## Rollback (if needed)

If you need to go back to Anthropic API:

1. Revert `requirements.txt`:
   ```
   anthropic>=0.40.0
   ```

2. Change model initialization:
   ```python
   from anthropic import Anthropic
   client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
   ```

3. Remove Bedrock IAM policy from CDK stack

## Questions?

See [BEDROCK_SETUP.md](./BEDROCK_SETUP.md) for detailed setup instructions.
