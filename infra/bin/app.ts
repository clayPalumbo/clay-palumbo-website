#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PortfolioStack } from '../lib/portfolio-stack';

const app = new cdk.App();

new PortfolioStack(app, 'ClayPalumboPortfolioStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // Required for CloudFront + ACM
  },
  domainName: 'claypalumbo.com',
  description: 'Clay Palumbo Portfolio with AI Agent',
});

app.synth();
