/**
 * Email Lambda Handler (Stubbed for MVP)
 *
 * This Lambda function receives email requests and logs them.
 * In production, this would integrate with AWS SES.
 */

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

interface EmailRequest {
  userType: string;
  fromName?: string;
  fromEmail?: string;
  subject: string;
  body: string;
  contextSummary: string;
}

interface EmailResponse {
  status: 'queued' | 'failed';
  messageId: string;
  willSend: boolean;
  note: string;
}

/**
 * Main Lambda handler for email sending (stubbed)
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Email handler invoked');

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: EmailRequest = JSON.parse(event.body);
    const { userType, fromName, fromEmail, subject, body, contextSummary } = request;

    // Validate required fields
    if (!subject || !body) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Subject and body are required' }),
      };
    }

    // Log the email (stubbed - in production, send via SES)
    console.log('='.repeat(60));
    console.log('EMAIL REQUEST (STUBBED)');
    console.log('='.repeat(60));
    console.log(`User Type: ${userType}`);
    console.log(`From: ${fromName || 'Unknown'} <${fromEmail || 'unknown@email.com'}>`);
    console.log(`Subject: ${subject}`);
    console.log(`Context: ${contextSummary}`);
    console.log(`Body:\n${body}`);
    console.log('='.repeat(60));

    // In production, send email via SES:
    /*
    const ses = new SESClient({ region: process.env.AWS_REGION });
    const sendCommand = new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: {
        ToAddresses: [process.env.TO_EMAIL],
      },
      Message: {
        Subject: { Data: subject },
        Body: {
          Text: {
            Data: `From: ${fromName} <${fromEmail}>\nType: ${userType}\n\n${body}\n\nContext: ${contextSummary}`,
          },
        },
      },
    });
    const response = await ses.send(sendCommand);
    */

    // Return stubbed response
    const response: EmailResponse = {
      status: 'queued',
      messageId: `fake-id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      willSend: false,
      note: 'This is a stub. Email not actually sent. In production, this would use AWS SES.',
    };

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error in email handler:', error);

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * CORS headers for API Gateway
 */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*', // In production, restrict to your domain
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };
}
