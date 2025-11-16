/**
 * Chat Lambda Handler with TRUE Streaming Support
 *
 * This Lambda function uses Lambda Response Streaming with Function URLs
 * 1. Receives chat messages from the frontend
 * 2. Calls AWS Bedrock (Claude model) with streaming
 * 3. Streams the response back in real-time via Server-Sent Events (SSE)
 */

import type { Context } from 'aws-lambda';
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configuration
const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'; // Claude Sonnet 4.5 inference profile
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Load system prompt from file
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompts', 'clay-agent-instructions.txt'), 'utf-8');

// Initialize Bedrock Runtime client
const client = new BedrockRuntimeClient({ region: AWS_REGION });

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

/**
 * Lambda Response Streaming Handler
 * This uses the awslambda.streamifyResponse wrapper for true streaming
 */
export const handler = awslambda.streamifyResponse(
  async (
    event: any,
    responseStream: NodeJS.WritableStream,
    context: Context
  ): Promise<void> => {
    const metadata = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    };

    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    try {
      // Parse request body
      const body = event.body || '{}';
      const request: ChatRequest = JSON.parse(body);
      const { messages, sessionId } = request;

      if (!messages || messages.length === 0) {
        responseStream.write('data: {"error": "Messages array is required"}\n\n');
        responseStream.end();
        return;
      }

      const latestMessage = messages[messages.length - 1];
      if (!latestMessage || latestMessage.role !== 'user') {
        responseStream.write('data: {"error": "Latest message must be from user"}\n\n');
        responseStream.end();
        return;
      }

      const effectiveSessionId = sessionId || generateSessionId();

      // Convert messages to Claude format
      const claudeMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: [
          {
            type: 'text',
            text: msg.content,
          },
        ],
      }));

      // Prepare request for Claude via Bedrock
      const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
        temperature: 0.7,
      };

      // Invoke Bedrock model with streaming
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await client.send(command);

      // Send session ID first
      responseStream.write(`data: ${JSON.stringify({ type: 'session', sessionId: effectiveSessionId })}\n\n`);

      // Process the stream
      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk?.bytes) {
            const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

            // Handle different event types from Claude
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              responseStream.write(`data: ${JSON.stringify({ type: 'content', text: chunk.delta.text })}\n\n`);
            } else if (chunk.type === 'message_stop') {
              responseStream.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            }
          }
        }
      }

      responseStream.end();
    } catch (error) {
      console.error('Error in streaming chat handler:', error);
      responseStream.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`
      );
      responseStream.end();
    }
  }
);

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * AWS Lambda global object for streaming
 */
declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: any,
      responseStream: NodeJS.WritableStream,
      context: Context
    ) => Promise<void>
  ) => any;
  HttpResponseStream: {
    from(
      stream: NodeJS.WritableStream,
      metadata: { statusCode: number; headers: Record<string, string> }
    ): NodeJS.WritableStream;
  };
};
