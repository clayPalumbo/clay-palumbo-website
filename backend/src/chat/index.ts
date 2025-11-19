/**
 * Chat Lambda Handler with Streaming Support
 *
 * This Lambda function uses Lambda Response Streaming with Function URLs
 * Architecture:
 * 1. Receives chat messages from the frontend
 * 2. Checks content guardrails (Nova Pro)
 * 3. Retrieves relevant context from Knowledge Base (RAG)
 * 4. Calls AWS Bedrock Claude with streaming
 * 5. Streams the response back in real-time via Server-Sent Events (SSE)
 */

import type { Context } from 'aws-lambda';
import { ChatRequest } from './types';
import { SYSTEM_PROMPT } from './config';
import { GuardrailService } from './services/guardrail.service';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { ClaudeService } from './services/claude.service';
import { MessageFormatter } from './utils/message-formatter';
import { SessionUtil } from './utils/session';
import { StreamWriter } from './utils/stream-writer';
import { getGuardrailErrorMessage } from './prompts/guardrail-message';

// Initialize services
const guardrailService = new GuardrailService();
const knowledgeBaseService = new KnowledgeBaseService();
const claudeService = new ClaudeService();

/**
 * Lambda Response Streaming Handler
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
        Connection: 'keep-alive',
      },
    };

    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    try {
      // Parse and validate request
      const request: ChatRequest = JSON.parse(event.body || '{}');
      const { messages, sessionId } = request;

      if (!messages || messages.length === 0) {
        StreamWriter.writeError(responseStream, 'Messages array is required');
        StreamWriter.end(responseStream);
        return;
      }

      const latestMessage = messages[messages.length - 1];
      if (!latestMessage || latestMessage.role !== 'user') {
        StreamWriter.writeError(responseStream, 'Latest message must be from user');
        StreamWriter.end(responseStream);
        return;
      }

      // Step 1: Check guardrails
      const guardrailCheck = await guardrailService.checkMessage(latestMessage.content);
      if (guardrailCheck.category !== 'ALLOWED') {
        StreamWriter.writeError(
          responseStream,
          'Content not allowed',
          getGuardrailErrorMessage(guardrailCheck.reason, guardrailCheck.category)
        );
        StreamWriter.end(responseStream);
        return;
      }

      // Step 2: Generate or use existing session ID
      const effectiveSessionId = sessionId || SessionUtil.generateId();

      // Step 3: Retrieve context from Knowledge Base (RAG)
      const knowledgeContext = await knowledgeBaseService.retrieve(latestMessage.content);
      const systemPrompt = knowledgeBaseService.augmentSystemPrompt(SYSTEM_PROMPT, knowledgeContext);

      // Step 4: Format messages for Claude
      const claudeMessages = MessageFormatter.toClaudeFormat(messages);

      if (!MessageFormatter.validate(claudeMessages)) {
        StreamWriter.writeError(responseStream, 'No valid messages after filtering');
        StreamWriter.end(responseStream);
        return;
      }

      // Step 5: Send session ID
      StreamWriter.writeSession(responseStream, effectiveSessionId);

      // Step 6: Invoke Claude with streaming
      await claudeService.invokeStreaming(systemPrompt, claudeMessages, responseStream);

      // Step 7: End stream
      StreamWriter.end(responseStream);
    } catch (error) {
      console.error('Error in streaming chat handler:', error);
      StreamWriter.writeError(
        responseStream,
        'Internal server error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      StreamWriter.end(responseStream);
    }
  }
);

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
