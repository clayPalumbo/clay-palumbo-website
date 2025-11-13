import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { execSync } from 'child_process';

const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();

async function deployFrontend() {
  try {
    // Get stack outputs
    const bucketName = execSync(
      'aws cloudformation describe-stacks --stack-name ClayPalumboPortfolioStack --query "Stacks[0].Outputs[?OutputKey==\'FrontendBucketName\'].OutputValue" --output text'
    )
      .toString()
      .trim();

    const distributionId = execSync(
      'aws cloudformation describe-stacks --stack-name ClayPalumboPortfolioStack --query "Stacks[0].Outputs[?OutputKey==\'DistributionId\'].OutputValue" --output text'
    )
      .toString()
      .trim();

    console.log(`Deploying frontend to bucket: ${bucketName}`);

    const distPath = path.join(__dirname, '../../frontend/dist');

    // Upload all files from dist
    await uploadDirectory(distPath, bucketName);

    console.log('Frontend deployed successfully!');

    // Invalidate CloudFront cache
    console.log('Invalidating CloudFront cache...');
    await cloudfront
      .createInvalidation({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Quantity: 1,
            Items: ['/*'],
          },
        },
      })
      .promise();

    console.log('CloudFront cache invalidated!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

async function uploadDirectory(dirPath: string, bucketName: string, prefix = '') {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await uploadDirectory(filePath, bucketName, path.join(prefix, file));
    } else {
      const key = path.join(prefix, file);
      const contentType = mime.lookup(filePath) || 'application/octet-stream';

      console.log(`Uploading: ${key}`);

      await s3
        .putObject({
          Bucket: bucketName,
          Key: key,
          Body: fs.readFileSync(filePath),
          ContentType: contentType,
          CacheControl: filePath.endsWith('.html')
            ? 'no-cache'
            : 'public, max-age=31536000, immutable',
        })
        .promise();
    }
  }
}

deployFrontend();
