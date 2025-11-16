#!/bin/bash
set -e

echo "================================"
echo "Clay Palumbo Portfolio Deployment"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK CLI is not installed. Run: npm install -g aws-cdk${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install
cd infra && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Build backend
echo "Step 2: Building backend..."
cd backend
npm run build
cd ..
echo -e "${GREEN}✓ Backend built${NC}"
echo ""

# Step 3: Deploy infrastructure
echo "Step 3: Deploying infrastructure with CDK..."
cd infra
cdk bootstrap
cdk deploy --require-approval never
cd ..
echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Step 4: Build and push agent
echo "Step 4: Building and pushing agent runtime..."
echo -e "${YELLOW}Note: Ensure Bedrock model access is enabled in your AWS account${NC}"

# Get ECR repository URI
REPO_URI=$(aws cloudformation describe-stacks \
  --stack-name ClayPalumboPortfolioStack \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentRepositoryUri`].OutputValue' \
  --output text)

REGION=$(aws configure get region || echo "us-east-1")
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push
echo "Building Docker image..."
cd agent-runtime
docker build -t claypalumbo-agent .
docker tag claypalumbo-agent:latest $REPO_URI:latest
echo "Pushing to ECR..."
docker push $REPO_URI:latest
cd ..
echo -e "${GREEN}✓ Agent runtime deployed${NC}"
echo ""

# Step 5: Build frontend
echo "Step 5: Building frontend..."
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ClayPalumboPortfolioStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

cd frontend
export VITE_API_URL=$API_URL
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 6: Deploy frontend to S3
echo "Step 6: Deploying frontend to S3..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ClayPalumboPortfolioStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ --delete

echo -e "${GREEN}✓ Frontend deployed to S3${NC}"
echo ""

# Step 7: Invalidate CloudFront cache
echo "Step 7: Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name ClayPalumboPortfolioStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" > /dev/null

echo -e "${GREEN}✓ CloudFront cache invalidated${NC}"
echo ""

# Step 8: Summary
echo "================================"
echo "Deployment Complete! 🎉"
echo "================================"
echo ""
echo "Your site is available at:"
WEBSITE_URL=$(aws cloudformation describe-stacks \
  --stack-name ClayPalumboPortfolioStack \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
  --output text)
echo -e "${GREEN}$WEBSITE_URL${NC}"
echo ""
echo "API Endpoint:"
echo -e "${GREEN}$API_URL${NC}"
echo ""
echo -e "${YELLOW}Important: Ensure Bedrock model access is enabled for Claude 3.5 Sonnet!${NC}"
echo "  Go to: AWS Console > Bedrock > Model access > Request model access"
echo ""
echo "To update in the future:"
echo "  - Frontend: npm run build:frontend && npm run deploy:frontend"
echo "  - Backend: cd backend && npm run build && cd ../infra && cdk deploy"
echo "  - Agent: npm run build:agent && npm run deploy:agent"
echo ""
