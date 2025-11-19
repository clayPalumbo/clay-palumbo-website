/**
 * Configuration constants for the chat service
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Model IDs
export const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
export const GUARDRAIL_MODEL_ID = 'us.amazon.nova-pro-v1:0';
export const KNOWLEDGE_BASE_ID = 'ZGSET1YNIR';
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Load prompts from files
export const SYSTEM_PROMPT = readFileSync(
  join(__dirname, 'prompts', 'clay-agent-instructions.txt'),
  'utf-8'
);

export const GUARDRAIL_PROMPT = readFileSync(
  join(__dirname, 'prompts', 'input-guardrails.txt'),
  'utf-8'
);

export const GUARDRAIL_SCHEMA = JSON.parse(
  readFileSync(join(__dirname, 'prompts', 'guardrail-schema.json'), 'utf-8')
);

// Model configuration
export const CLAUDE_CONFIG = {
  anthropicVersion: 'bedrock-2023-05-31',
  maxTokens: 2048,
  temperature: 0.7,
} as const;

export const GUARDRAIL_CONFIG = {
  maxTokens: 200,
  temperature: 0,
  topK: 1,
} as const;

export const KNOWLEDGE_BASE_CONFIG = {
  numberOfResults: 5,
} as const;
