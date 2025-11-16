import type { ChatRequest, ChatResponse, EmailRequest, EmailResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://z8bglb0j57.execute-api.us-east-1.amazonaws.com';
const STREAMING_API_URL = import.meta.env.VITE_STREAMING_API_URL || 'https://s4mppgfvwmyjesir3jt4bnnr4y0sjcuk.lambda-url.us-east-1.on.aws/';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export interface StreamEvent {
  type: 'session' | 'content' | 'done' | 'error';
  sessionId?: string;
  text?: string;
  error?: string;
  message?: string;
}

/**
 * Send a chat message with streaming support via Server-Sent Events (SSE)
 * Calls the onChunk callback for each streamed piece of content
 */
export async function sendChatMessageStreaming(
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onSessionId?: (sessionId: string) => void
): Promise<void> {
  const response = await fetch(STREAMING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new APIError(response.status, 'Failed to send message');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (separated by \n\n)
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix
          try {
            const event: StreamEvent = JSON.parse(data);

            if (event.type === 'session' && event.sessionId && onSessionId) {
              onSessionId(event.sessionId);
            } else if (event.type === 'content' && event.text) {
              onChunk(event.text);
            } else if (event.type === 'error') {
              // Display error message in chat instead of throwing
              onChunk(event.message || 'An error occurred while processing your request.');
            }
            // 'done' events are ignored, we just finish when the stream ends
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Send a chat message and get a response (legacy non-streaming)
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(response.status, error.error || 'Failed to send message');
  }

  return response.json();
}

/**
 * Send an email (stubbed for MVP)
 */
export async function sendEmail(request: EmailRequest): Promise<EmailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(response.status, error.error || 'Failed to send email');
  }

  return response.json();
}
