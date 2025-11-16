import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface PortfolioStackProps extends cdk.StackProps {
    domainName?: string;
}
export declare class PortfolioStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PortfolioStackProps);
}
