/**
 * Claude Service - Handles interactions with Amazon Bedrock Claude models
 */

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { MODEL_ID, CLAUDE_CONFIG, AWS_REGION } from '../config';
import { ClaudeMessage } from '../types';
import { StreamWriter } from '../utils/stream-writer';

export class ClaudeService {
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({ region: AWS_REGION });
  }

  /**
   * Invoke Claude with streaming and write responses to the stream
   */
  async invokeStreaming(
    systemPrompt: string,
    messages: ClaudeMessage[],
    responseStream: NodeJS.WritableStream
  ): Promise<void> {
    const requestBody = {
      anthropic_version: CLAUDE_CONFIG.anthropicVersion,
      max_tokens: CLAUDE_CONFIG.maxTokens,
      system: systemPrompt,
      messages: messages,
      temperature: CLAUDE_CONFIG.temperature,
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.client.send(command);

    // Process the stream
    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          // Handle Claude response format
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            StreamWriter.writeContent(responseStream, chunk.delta.text);
          } else if (chunk.type === 'message_stop') {
            StreamWriter.writeDone(responseStream);
          }
        }
      }
    }
  }
}
