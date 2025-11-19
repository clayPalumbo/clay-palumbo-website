/**
 * Guardrail Service - Handles content moderation using Amazon Nova Pro
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  GUARDRAIL_MODEL_ID,
  GUARDRAIL_PROMPT,
  GUARDRAIL_SCHEMA,
  GUARDRAIL_CONFIG,
  AWS_REGION,
} from '../config';
import { GuardrailResponse } from '../types';

export class GuardrailService {
  private client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({ region: AWS_REGION });
  }

  /**
   * Check if a user message passes content guardrails
   */
  async checkMessage(userMessage: string): Promise<GuardrailResponse> {
    try {
      const requestBody = {
        system: [{ text: GUARDRAIL_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [{ text: `Evaluate this message: "${userMessage.replace(/"/g, '\\"')}"` }],
          },
        ],
        inferenceConfig: GUARDRAIL_CONFIG,
        toolConfig: GUARDRAIL_SCHEMA,
      };

      const command = new InvokeModelCommand({
        modelId: GUARDRAIL_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Nova Pro with tool use returns structured output
      const toolUse = responseBody.output?.message?.content?.find((c: any) => c.toolUse);
      console.log('Guardrail tool use response:', JSON.stringify(toolUse));

      if (toolUse?.toolUse?.input) {
        return {
          allowed: !!toolUse.toolUse.input.allowed,
          reason: toolUse.toolUse.input.reason,
          category: toolUse.toolUse.input.category,
        };
      }

      // Fallback - fail open if no tool use found
      console.error('No tool use found in guardrail response:', JSON.stringify(responseBody));
      return { allowed: true, reason: 'Guardrail error - defaulting to allow' };
    } catch (error) {
      console.error('Error in guardrail check:', error);
      // Fail open - allow message if guardrail service is down
      return { allowed: true, reason: 'Guardrail service error' };
    }
  }
}
