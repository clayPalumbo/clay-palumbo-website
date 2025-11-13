# Clay Palumbo Portfolio

A modern, production-quality personal portfolio site with a conversational AI agent powered by Strands and AWS AgentCore.

## Overview

This is a "new age resume" - a personal portfolio where visitors interact with an AI agent that knows Clay's background, projects, and approach to building products and teams. The agent can detect visitor type (recruiter, client, peer, executive) and tailor responses accordingly.

### Key Features

- **AI Agent**: Conversational agent built with Strands framework on AWS AgentCore
- **Modern Chat UI**: React SPA with streaming message support
- **Serverless Architecture**: AWS Lambda, API Gateway, S3, CloudFront
- **Audience Detection**: Agent classifies visitors and tailors responses
- **Email Integration**: Stubbed email tool (ready for SES integration)
- **Production-Ready**: CDK infrastructure, Docker containers, full CI/CD support

## Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  CloudFront     │
│  + Route 53     │
└──────┬──────────┘
       │
       ├──► S3 (Frontend: React SPA)
       │
       └──► API Gateway
            │
            ├──► Lambda (Chat)
            │     └──► Bedrock AgentCore
            │           └──► Strands Agent (Docker/ECR)
            │
            └──► Lambda (Email - stubbed)
```

### Components

1. **Frontend** (`/frontend`): React + TypeScript + Vite + Tailwind CSS
2. **Backend** (`/backend`): TypeScript Lambda functions
3. **Agent Runtime** (`/agent-runtime`): Python + Strands + AgentCore
4. **Infrastructure** (`/infra`): AWS CDK (TypeScript)

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker** (for agent runtime)
- **AWS CLI** configured with appropriate credentials
- **AWS CDK** CLI (`npm install -g aws-cdk`)

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all

# Install agent runtime dependencies
cd agent-runtime && pip install -r requirements.txt
```

### 2. Configuration

Create environment files:

```bash
# Agent runtime
cp agent-runtime/.env.example agent-runtime/.env
# Edit and add your ANTHROPIC_API_KEY
```

### 3. Local Development

#### Run Frontend

```bash
npm run dev:frontend
# Opens at http://localhost:5173
```

#### Run Agent Runtime Locally

```bash
cd agent-runtime
export ANTHROPIC_API_KEY=your_key_here
export AWS_REGION=us-east-1
python agent.py
# Agent runs at http://localhost:8080
```

#### Test Backend Functions

```bash
cd backend
npm run build
# Lambda functions ready in dist/
```

## Deployment

### Full Deployment (One Command)

```bash
npm run deploy:all
```

This will:
1. Build frontend
2. Build backend
3. Build and push agent Docker image
4. Deploy CDK infrastructure
5. Upload frontend to S3
6. Invalidate CloudFront cache

### Step-by-Step Deployment

#### 1. Deploy Infrastructure

```bash
cd infra
npm run deploy
```

This creates:
- S3 bucket for frontend
- CloudFront distribution
- Route 53 records
- API Gateway + Lambda functions
- ECR repository

#### 2. Build and Push Agent Runtime

```bash
npm run build:agent
npm run deploy:agent
```

#### 3. Deploy Frontend

```bash
npm run build:frontend
npm run deploy:frontend
```

### Post-Deployment

After deployment, get your outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name ClayPalumboPortfolioStack \
  --query 'Stacks[0].Outputs'
```

You'll see:
- `WebsiteUrl`: https://claypalumbo.com
- `ApiUrl`: API Gateway endpoint
- `DistributionId`: CloudFront distribution ID

## Project Structure

```
.
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── api/          # API client
│   │   ├── types.ts      # TypeScript types
│   │   └── App.tsx       # Main app
│   ├── index.html
│   └── package.json
│
├── backend/              # Lambda functions
│   ├── src/
│   │   ├── chat/         # Chat streaming handler
│   │   └── email/        # Email handler (stubbed)
│   └── package.json
│
├── agent-runtime/        # Strands + AgentCore
│   ├── agent.py          # Main agent with entrypoint
│   ├── clay_profile.json # Knowledge base
│   ├── Dockerfile        # Agent container
│   └── requirements.txt
│
├── infra/                # AWS CDK
│   ├── lib/
│   │   └── portfolio-stack.ts
│   ├── bin/
│   │   └── app.ts
│   └── scripts/          # Deployment scripts
│
├── TODO.md              # Implementation checklist
├── README.md            # This file
└── AGENT_DESIGN.md      # Agent design details
```

## Agent Capabilities

The AI agent can:

1. **Answer questions** about Clay's experience, skills, and projects
2. **Classify visitors** (recruiter, client, peer, executive, unknown)
3. **Tailor responses** based on audience type
4. **Send emails** (stubbed for MVP, ready for SES)

See [AGENT_DESIGN.md](./AGENT_DESIGN.md) for detailed agent architecture.

## Customization

### Update Clay's Profile

Edit `agent-runtime/clay_profile.json` to update:
- Experience
- Technologies
- Strengths
- Projects
- Audience-specific messaging

### Add Real Email Sending

1. Set up AWS SES and verify your email
2. Update `backend/src/email/index.ts` to use SES SDK
3. Update Lambda IAM role to allow SES sending
4. Redeploy backend

### Extend Agent Tools

Add new tools in `agent-runtime/agent.py`:

```python
@tool
def my_new_tool(param: str) -> dict:
    """Tool description for the LLM"""
    # Your logic here
    return {"result": "..."}

# Add to agent initialization
agent = Agent(
    model=model,
    system_prompt=system_prompt,
    tools=[classify_visitor, send_email, my_new_tool],  # Add here
)
```

## Testing

### Frontend

```bash
cd frontend
npm test
```

### Backend

```bash
cd backend
npm test
```

### Agent Runtime

```bash
cd agent-runtime
pytest  # Add tests as needed
```

## Monitoring

- **CloudWatch Logs**: Lambda function logs
- **CloudFront Metrics**: Request/error rates
- **AgentCore Console**: Agent invocations and performance

## Cost Estimation

Monthly costs (assuming moderate traffic):

- **CloudFront**: ~$1-5
- **S3**: < $1
- **Lambda**: ~$5-20
- **API Gateway**: ~$1-5
- **AgentCore**: Based on usage
- **Bedrock (Claude)**: Based on token usage

Total: ~$15-50/month for typical usage

## Security

- HTTPS enforced via CloudFront + ACM
- API Gateway with CORS configured
- Lambda functions with minimal IAM permissions
- No hardcoded credentials (use environment variables)
- S3 bucket not publicly accessible (CloudFront OAI)

## Troubleshooting

### Frontend not loading

- Check CloudFront distribution status
- Verify DNS propagation (`dig claypalumbo.com`)
- Check browser console for errors

### Agent not responding

- Check Lambda logs in CloudWatch
- Verify AgentCore agent is deployed
- Check ANTHROPIC_API_KEY is set

### Build failures

- Clear node_modules and reinstall
- Check Node/Python versions
- Verify Docker is running (for agent build)

## Contributing

This is a personal portfolio, but feel free to:
- Report issues
- Suggest improvements
- Use as a template for your own portfolio

## License

MIT License - see LICENSE file

## Contact

Clay Palumbo
- Website: https://claypalumbo.com
- Email: clay@claypalumbo.com
