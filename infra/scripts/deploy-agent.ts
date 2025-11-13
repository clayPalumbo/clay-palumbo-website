import { execSync } from 'child_process';

async function deployAgent() {
  try {
    console.log('Getting ECR repository URI...');
    const repositoryUri = execSync(
      'aws cloudformation describe-stacks --stack-name ClayPalumboPortfolioStack --query "Stacks[0].Outputs[?OutputKey==\'AgentRepositoryUri\'].OutputValue" --output text'
    )
      .toString()
      .trim();

    console.log(`Repository URI: ${repositoryUri}`);

    // Get AWS account ID and region
    const accountId = execSync('aws sts get-caller-identity --query Account --output text')
      .toString()
      .trim();
    const region = 'us-east-1';

    console.log('Logging in to ECR...');
    execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${region}.amazonaws.com`,
      { stdio: 'inherit' }
    );

    console.log('Building Docker image...');
    execSync('cd ../agent-runtime && docker build -t claypalumbo-agent .', {
      stdio: 'inherit',
    });

    console.log('Tagging image...');
    execSync(`docker tag claypalumbo-agent:latest ${repositoryUri}:latest`, {
      stdio: 'inherit',
    });

    console.log('Pushing image to ECR...');
    execSync(`docker push ${repositoryUri}:latest`, { stdio: 'inherit' });

    console.log('Agent runtime deployed successfully!');
  } catch (error) {
    console.error('Agent deployment failed:', error);
    process.exit(1);
  }
}

deployAgent();
