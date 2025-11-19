/**
 * Type definitions for the chat handler
 */

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

export interface GuardrailResponse {
  allowed: boolean;
  reason?: string;
  category?: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface StreamEvent {
  type: 'session' | 'content' | 'done' | 'error';
  sessionId?: string;
  text?: string;
  error?: string;
  message?: string;
}
