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
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getGuardrailErrorMessage } from './prompts/guardrail-message';

// Configuration
// const MODEL_ID = 'anthropic.claude-haiku-4-5-20251001-v1:0';
const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0'; // Claude Sonnet 4.5 inference profile
const GUARDRAIL_MODEL_ID = 'us.amazon.nova-pro-v1:0'; // Nova Pro for guardrails
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Load system prompts from files
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompts', 'clay-agent-instructions.txt'), 'utf-8');
const GUARDRAIL_PROMPT = readFileSync(join(__dirname, 'prompts', 'input-guardrails.txt'), 'utf-8');
const GUARDRAIL_SCHEMA = JSON.parse(readFileSync(join(__dirname, 'prompts', 'guardrail-schema.json'), 'utf-8'));

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

interface GuardrailResponse {
  allowed: boolean;
  reason?: string;
  category?: string;
}

/**
 * Check if the user message passes content guardrails using Nova Pro with structured outputs
 */
async function checkGuardrail(userMessage: string): Promise<GuardrailResponse> {
  const requestBody = {
    system: [{ text: GUARDRAIL_PROMPT }],
    messages: [
      {
        role: 'user',
        content: [{ text: `Evaluate this message: "${userMessage.replace(/"/g, '\\"')}"` }],
      },
    ],
    inferenceConfig: {
      maxTokens: 200, // Increased for tool use with chain-of-thought reasoning
      temperature: 0,
      topK: 1, // Required for greedy decoding with Nova models
    },
    toolConfig: GUARDRAIL_SCHEMA,
  };

  const command = new InvokeModelCommand({
    modelId: GUARDRAIL_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Nova Pro with tool use returns {output: {message: {content: [{toolUse: {...}}]}}}
  const toolUse = responseBody.output?.message?.content?.find((c: any) => c.toolUse);
  console.log('Guardrail tool use response:', JSON.stringify(toolUse));
  if (toolUse?.toolUse?.input) {
    return {
      allowed: !!toolUse.toolUse.input.allowed,
      reason: toolUse.toolUse.input.reason,
      category: toolUse.toolUse.input.category,
    };
  }

  // Fallback - if no tool use found, default to allowing (fail open)
  console.error('No tool use found in guardrail response:', JSON.stringify(responseBody));
  return { allowed: true, reason: 'Guardrail error - defaulting to allow' };
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

      // Check guardrails before processing
      const guardrailCheck = await checkGuardrail(latestMessage.content);
      if (!(guardrailCheck.category === 'ALLOWED')) {
        responseStream.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: 'Content not allowed',
            message: getGuardrailErrorMessage(guardrailCheck.reason, guardrailCheck.category)
          })}\n\n`
        );
        responseStream.end();
        return;
      }

      const effectiveSessionId = sessionId || generateSessionId();

      // Convert messages to Claude format, filtering out empty messages
      const claudeMessages = messages
        .filter(msg => msg.content && msg.content.trim().length > 0)
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: [
            {
              type: 'text',
              text: msg.content,
            },
          ],
        }));

      // Ensure we have messages after filtering
      if (claudeMessages.length === 0) {
        responseStream.write('data: {"error": "No valid messages after filtering"}\\n\\n');
        responseStream.end();
        return;
      }

      // Prepare request body for Claude
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

            // Handle Claude response format
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
