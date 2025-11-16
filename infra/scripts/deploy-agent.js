"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
async function deployAgent() {
    try {
        console.log('Getting ECR repository URI...');
        const repositoryUri = (0, child_process_1.execSync)('aws cloudformation describe-stacks --stack-name ClayPalumboPortfolioStack --query "Stacks[0].Outputs[?OutputKey==\'AgentRepositoryUri\'].OutputValue" --output text')
            .toString()
            .trim();
        console.log(`Repository URI: ${repositoryUri}`);
        // Get AWS account ID and region
        const accountId = (0, child_process_1.execSync)('aws sts get-caller-identity --query Account --output text')
            .toString()
            .trim();
        const region = 'us-east-1';
        console.log('Logging in to ECR...');
        (0, child_process_1.execSync)(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${region}.amazonaws.com`, { stdio: 'inherit' });
        console.log('Building Docker image...');
        (0, child_process_1.execSync)('cd ../agent-runtime && docker build -t claypalumbo-agent .', {
            stdio: 'inherit',
        });
        console.log('Tagging image...');
        (0, child_process_1.execSync)(`docker tag claypalumbo-agent:latest ${repositoryUri}:latest`, {
            stdio: 'inherit',
        });
        console.log('Pushing image to ECR...');
        (0, child_process_1.execSync)(`docker push ${repositoryUri}:latest`, { stdio: 'inherit' });
        console.log('Agent runtime deployed successfully!');
    }
    catch (error) {
        console.error('Agent deployment failed:', error);
        process.exit(1);
    }
}
deployAgent();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LWFnZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVwbG95LWFnZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsaURBQXlDO0FBRXpDLEtBQUssVUFBVSxXQUFXO0lBQ3hCLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUM3QyxNQUFNLGFBQWEsR0FBRyxJQUFBLHdCQUFRLEVBQzVCLHFLQUFxSyxDQUN0SzthQUNFLFFBQVEsRUFBRTthQUNWLElBQUksRUFBRSxDQUFDO1FBRVYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUVoRCxnQ0FBZ0M7UUFDaEMsTUFBTSxTQUFTLEdBQUcsSUFBQSx3QkFBUSxFQUFDLDJEQUEyRCxDQUFDO2FBQ3BGLFFBQVEsRUFBRTthQUNWLElBQUksRUFBRSxDQUFDO1FBQ1YsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDO1FBRTNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwQyxJQUFBLHdCQUFRLEVBQ04sdUNBQXVDLE1BQU0sbURBQW1ELFNBQVMsWUFBWSxNQUFNLGdCQUFnQixFQUMzSSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FDckIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN4QyxJQUFBLHdCQUFRLEVBQUMsNERBQTRELEVBQUU7WUFDckUsS0FBSyxFQUFFLFNBQVM7U0FDakIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2hDLElBQUEsd0JBQVEsRUFBQyx1Q0FBdUMsYUFBYSxTQUFTLEVBQUU7WUFDdEUsS0FBSyxFQUFFLFNBQVM7U0FDakIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3ZDLElBQUEsd0JBQVEsRUFBQyxlQUFlLGFBQWEsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFFdEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7QUFDSCxDQUFDO0FBRUQsV0FBVyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5hc3luYyBmdW5jdGlvbiBkZXBsb3lBZ2VudCgpIHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZygnR2V0dGluZyBFQ1IgcmVwb3NpdG9yeSBVUkkuLi4nKTtcbiAgICBjb25zdCByZXBvc2l0b3J5VXJpID0gZXhlY1N5bmMoXG4gICAgICAnYXdzIGNsb3VkZm9ybWF0aW9uIGRlc2NyaWJlLXN0YWNrcyAtLXN0YWNrLW5hbWUgQ2xheVBhbHVtYm9Qb3J0Zm9saW9TdGFjayAtLXF1ZXJ5IFwiU3RhY2tzWzBdLk91dHB1dHNbP091dHB1dEtleT09XFwnQWdlbnRSZXBvc2l0b3J5VXJpXFwnXS5PdXRwdXRWYWx1ZVwiIC0tb3V0cHV0IHRleHQnXG4gICAgKVxuICAgICAgLnRvU3RyaW5nKClcbiAgICAgIC50cmltKCk7XG5cbiAgICBjb25zb2xlLmxvZyhgUmVwb3NpdG9yeSBVUkk6ICR7cmVwb3NpdG9yeVVyaX1gKTtcblxuICAgIC8vIEdldCBBV1MgYWNjb3VudCBJRCBhbmQgcmVnaW9uXG4gICAgY29uc3QgYWNjb3VudElkID0gZXhlY1N5bmMoJ2F3cyBzdHMgZ2V0LWNhbGxlci1pZGVudGl0eSAtLXF1ZXJ5IEFjY291bnQgLS1vdXRwdXQgdGV4dCcpXG4gICAgICAudG9TdHJpbmcoKVxuICAgICAgLnRyaW0oKTtcbiAgICBjb25zdCByZWdpb24gPSAndXMtZWFzdC0xJztcblxuICAgIGNvbnNvbGUubG9nKCdMb2dnaW5nIGluIHRvIEVDUi4uLicpO1xuICAgIGV4ZWNTeW5jKFxuICAgICAgYGF3cyBlY3IgZ2V0LWxvZ2luLXBhc3N3b3JkIC0tcmVnaW9uICR7cmVnaW9ufSB8IGRvY2tlciBsb2dpbiAtLXVzZXJuYW1lIEFXUyAtLXBhc3N3b3JkLXN0ZGluICR7YWNjb3VudElkfS5ka3IuZWNyLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tYCxcbiAgICAgIHsgc3RkaW86ICdpbmhlcml0JyB9XG4gICAgKTtcblxuICAgIGNvbnNvbGUubG9nKCdCdWlsZGluZyBEb2NrZXIgaW1hZ2UuLi4nKTtcbiAgICBleGVjU3luYygnY2QgLi4vYWdlbnQtcnVudGltZSAmJiBkb2NrZXIgYnVpbGQgLXQgY2xheXBhbHVtYm8tYWdlbnQgLicsIHtcbiAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnVGFnZ2luZyBpbWFnZS4uLicpO1xuICAgIGV4ZWNTeW5jKGBkb2NrZXIgdGFnIGNsYXlwYWx1bWJvLWFnZW50OmxhdGVzdCAke3JlcG9zaXRvcnlVcml9OmxhdGVzdGAsIHtcbiAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnUHVzaGluZyBpbWFnZSB0byBFQ1IuLi4nKTtcbiAgICBleGVjU3luYyhgZG9ja2VyIHB1c2ggJHtyZXBvc2l0b3J5VXJpfTpsYXRlc3RgLCB7IHN0ZGlvOiAnaW5oZXJpdCcgfSk7XG5cbiAgICBjb25zb2xlLmxvZygnQWdlbnQgcnVudGltZSBkZXBsb3llZCBzdWNjZXNzZnVsbHkhJyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQWdlbnQgZGVwbG95bWVudCBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxufVxuXG5kZXBsb3lBZ2VudCgpO1xuIl19