"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = __importStar(require("aws-sdk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mime = __importStar(require("mime-types"));
const child_process_1 = require("child_process");
const s3 = new AWS.S3();
const cloudfront = new AWS.CloudFront();
async function deployFrontend() {
    try {
        // Get stack outputs
        const bucketName = (0, child_process_1.execSync)('aws cloudformation describe-stacks --stack-name ClayPalumboPortfolioStack --query "Stacks[0].Outputs[?OutputKey==\'FrontendBucketName\'].OutputValue" --output text')
            .toString()
            .trim();
        const distributionId = (0, child_process_1.execSync)('aws cloudformation describe-stacks --stack-name ClayPalumboPortfolioStack --query "Stacks[0].Outputs[?OutputKey==\'DistributionId\'].OutputValue" --output text')
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
    }
    catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}
async function uploadDirectory(dirPath, bucketName, prefix = '') {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            await uploadDirectory(filePath, bucketName, path.join(prefix, file));
        }
        else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LWZyb250ZW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVwbG95LWZyb250ZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQStCO0FBQy9CLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsaURBQW1DO0FBQ25DLGlEQUF5QztBQUV6QyxNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUN4QixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUV4QyxLQUFLLFVBQVUsY0FBYztJQUMzQixJQUFJLENBQUM7UUFDSCxvQkFBb0I7UUFDcEIsTUFBTSxVQUFVLEdBQUcsSUFBQSx3QkFBUSxFQUN6QixxS0FBcUssQ0FDdEs7YUFDRSxRQUFRLEVBQUU7YUFDVixJQUFJLEVBQUUsQ0FBQztRQUVWLE1BQU0sY0FBYyxHQUFHLElBQUEsd0JBQVEsRUFDN0IsaUtBQWlLLENBQ2xLO2FBQ0UsUUFBUSxFQUFFO2FBQ1YsSUFBSSxFQUFFLENBQUM7UUFFVixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRTNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFFN0QsNkJBQTZCO1FBQzdCLE1BQU0sZUFBZSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUU1QyxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFFL0MsOEJBQThCO1FBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUNoRCxNQUFNLFVBQVU7YUFDYixrQkFBa0IsQ0FBQztZQUNsQixjQUFjLEVBQUUsY0FBYztZQUM5QixpQkFBaUIsRUFBRTtnQkFDakIsZUFBZSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RDLEtBQUssRUFBRTtvQkFDTCxRQUFRLEVBQUUsQ0FBQztvQkFDWCxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUM7aUJBQ2Q7YUFDRjtTQUNGLENBQUM7YUFDRCxPQUFPLEVBQUUsQ0FBQztRQUViLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxlQUFlLENBQUMsT0FBZSxFQUFFLFVBQWtCLEVBQUUsTUFBTSxHQUFHLEVBQUU7SUFDN0UsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFbkMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN2QixNQUFNLGVBQWUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkUsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLDBCQUEwQixDQUFDO1lBRXhFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRWpDLE1BQU0sRUFBRTtpQkFDTCxTQUFTLENBQUM7Z0JBQ1QsTUFBTSxFQUFFLFVBQVU7Z0JBQ2xCLEdBQUcsRUFBRSxHQUFHO2dCQUNSLElBQUksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztnQkFDL0IsV0FBVyxFQUFFLFdBQVc7Z0JBQ3hCLFlBQVksRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDdEMsQ0FBQyxDQUFDLFVBQVU7b0JBQ1osQ0FBQyxDQUFDLHFDQUFxQzthQUMxQyxDQUFDO2lCQUNELE9BQU8sRUFBRSxDQUFDO1FBQ2YsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsY0FBYyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBBV1MgZnJvbSAnYXdzLXNkayc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbWltZSBmcm9tICdtaW1lLXR5cGVzJztcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5cbmNvbnN0IHMzID0gbmV3IEFXUy5TMygpO1xuY29uc3QgY2xvdWRmcm9udCA9IG5ldyBBV1MuQ2xvdWRGcm9udCgpO1xuXG5hc3luYyBmdW5jdGlvbiBkZXBsb3lGcm9udGVuZCgpIHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgc3RhY2sgb3V0cHV0c1xuICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSBleGVjU3luYyhcbiAgICAgICdhd3MgY2xvdWRmb3JtYXRpb24gZGVzY3JpYmUtc3RhY2tzIC0tc3RhY2stbmFtZSBDbGF5UGFsdW1ib1BvcnRmb2xpb1N0YWNrIC0tcXVlcnkgXCJTdGFja3NbMF0uT3V0cHV0c1s/T3V0cHV0S2V5PT1cXCdGcm9udGVuZEJ1Y2tldE5hbWVcXCddLk91dHB1dFZhbHVlXCIgLS1vdXRwdXQgdGV4dCdcbiAgICApXG4gICAgICAudG9TdHJpbmcoKVxuICAgICAgLnRyaW0oKTtcblxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbklkID0gZXhlY1N5bmMoXG4gICAgICAnYXdzIGNsb3VkZm9ybWF0aW9uIGRlc2NyaWJlLXN0YWNrcyAtLXN0YWNrLW5hbWUgQ2xheVBhbHVtYm9Qb3J0Zm9saW9TdGFjayAtLXF1ZXJ5IFwiU3RhY2tzWzBdLk91dHB1dHNbP091dHB1dEtleT09XFwnRGlzdHJpYnV0aW9uSWRcXCddLk91dHB1dFZhbHVlXCIgLS1vdXRwdXQgdGV4dCdcbiAgICApXG4gICAgICAudG9TdHJpbmcoKVxuICAgICAgLnRyaW0oKTtcblxuICAgIGNvbnNvbGUubG9nKGBEZXBsb3lpbmcgZnJvbnRlbmQgdG8gYnVja2V0OiAke2J1Y2tldE5hbWV9YCk7XG5cbiAgICBjb25zdCBkaXN0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9mcm9udGVuZC9kaXN0Jyk7XG5cbiAgICAvLyBVcGxvYWQgYWxsIGZpbGVzIGZyb20gZGlzdFxuICAgIGF3YWl0IHVwbG9hZERpcmVjdG9yeShkaXN0UGF0aCwgYnVja2V0TmFtZSk7XG5cbiAgICBjb25zb2xlLmxvZygnRnJvbnRlbmQgZGVwbG95ZWQgc3VjY2Vzc2Z1bGx5IScpO1xuXG4gICAgLy8gSW52YWxpZGF0ZSBDbG91ZEZyb250IGNhY2hlXG4gICAgY29uc29sZS5sb2coJ0ludmFsaWRhdGluZyBDbG91ZEZyb250IGNhY2hlLi4uJyk7XG4gICAgYXdhaXQgY2xvdWRmcm9udFxuICAgICAgLmNyZWF0ZUludmFsaWRhdGlvbih7XG4gICAgICAgIERpc3RyaWJ1dGlvbklkOiBkaXN0cmlidXRpb25JZCxcbiAgICAgICAgSW52YWxpZGF0aW9uQmF0Y2g6IHtcbiAgICAgICAgICBDYWxsZXJSZWZlcmVuY2U6IERhdGUubm93KCkudG9TdHJpbmcoKSxcbiAgICAgICAgICBQYXRoczoge1xuICAgICAgICAgICAgUXVhbnRpdHk6IDEsXG4gICAgICAgICAgICBJdGVtczogWycvKiddLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICAgLnByb21pc2UoKTtcblxuICAgIGNvbnNvbGUubG9nKCdDbG91ZEZyb250IGNhY2hlIGludmFsaWRhdGVkIScpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0RlcGxveW1lbnQgZmFpbGVkOicsIGVycm9yKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gdXBsb2FkRGlyZWN0b3J5KGRpclBhdGg6IHN0cmluZywgYnVja2V0TmFtZTogc3RyaW5nLCBwcmVmaXggPSAnJykge1xuICBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGRpclBhdGgpO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIGZpbGUpO1xuICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlUGF0aCk7XG5cbiAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBhd2FpdCB1cGxvYWREaXJlY3RvcnkoZmlsZVBhdGgsIGJ1Y2tldE5hbWUsIHBhdGguam9pbihwcmVmaXgsIGZpbGUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qga2V5ID0gcGF0aC5qb2luKHByZWZpeCwgZmlsZSk7XG4gICAgICBjb25zdCBjb250ZW50VHlwZSA9IG1pbWUubG9va3VwKGZpbGVQYXRoKSB8fCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcblxuICAgICAgY29uc29sZS5sb2coYFVwbG9hZGluZzogJHtrZXl9YCk7XG5cbiAgICAgIGF3YWl0IHMzXG4gICAgICAgIC5wdXRPYmplY3Qoe1xuICAgICAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcbiAgICAgICAgICBLZXk6IGtleSxcbiAgICAgICAgICBCb2R5OiBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgpLFxuICAgICAgICAgIENvbnRlbnRUeXBlOiBjb250ZW50VHlwZSxcbiAgICAgICAgICBDYWNoZUNvbnRyb2w6IGZpbGVQYXRoLmVuZHNXaXRoKCcuaHRtbCcpXG4gICAgICAgICAgICA/ICduby1jYWNoZSdcbiAgICAgICAgICAgIDogJ3B1YmxpYywgbWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlJyxcbiAgICAgICAgfSlcbiAgICAgICAgLnByb21pc2UoKTtcbiAgICB9XG4gIH1cbn1cblxuZGVwbG95RnJvbnRlbmQoKTtcbiJdfQ==