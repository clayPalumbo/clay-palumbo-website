/**
 * Chat Lambda Handler with Streaming Support
 *
 * This Lambda function:
 * 1. Receives chat messages from the frontend
 * 2. Calls the AgentCore runtime (Strands agent)
 * 3. Streams the response back via Lambda Response Streaming
 */

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

// Configuration
const AGENT_ID = process.env.AGENT_ID || '';
const AGENT_ALIAS_ID = process.env.AGENT_ALIAS_ID || 'TSTALIASID';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize Bedrock Agent Runtime client
const client = new BedrockAgentRuntimeClient({ region: AWS_REGION });

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

/**
 * Main Lambda handler for chat streaming
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Chat handler invoked');

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: ChatRequest = JSON.parse(event.body);
    const { messages, sessionId } = request;

    if (!messages || messages.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Messages array is required' }),
      };
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Latest message must be from user' }),
      };
    }

    const prompt = latestMessage.content;
    const effectiveSessionId = sessionId || generateSessionId();

    console.log(`Processing message for session: ${effectiveSessionId}`);

    // Invoke AgentCore runtime
    const command = new InvokeAgentCommand({
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: effectiveSessionId,
      inputText: prompt,
    });

    const response = await client.send(command);

    // Collect streaming response
    let fullResponse = '';

    if (response.completion) {
      for await (const event of response.completion) {
        if (event.chunk && event.chunk.bytes) {
          const chunk = new TextDecoder().decode(event.chunk.bytes);
          fullResponse += chunk;
        }
      }
    }

    // For API Gateway HTTP API, we need to return the full response
    // (Lambda Response Streaming requires Function URLs or specific setup)
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response: fullResponse,
        sessionId: effectiveSessionId,
      }),
    };
  } catch (error) {
    console.error('Error in chat handler:', error);

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
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

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
