/**
 * Simple script to test prompts against Bedrock (no streaming)
 * Usage: npx tsx src/chat/test-prompt.ts "Your message here"
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { readFileSync } from 'fs';
import { join } from 'path';

const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const client = new BedrockRuntimeClient({ region: AWS_REGION });

async function testPrompt(userMessage: string) {
  // Load system prompt from file (reloads on each run)
  const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompts', 'clay-agent-instructions.txt'), 'utf-8');

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
    temperature: 0.7,
  };

  console.log('\n🚀 Calling Bedrock with message:', userMessage);
  console.log('📝 Using prompt from: src/chat/prompts/clay-agent-instructions.txt\n');

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  console.log('✅ Response:\n');
  console.log(responseBody.content[0].text);
  console.log('\n');
}

// Get message from command line args
const message = process.argv[2] || 'Hi, tell me about your experience at Slalom';
testPrompt(message).catch(console.error);
