export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
}

export interface EmailRequest {
  userType: string;
  fromName?: string;
  fromEmail?: string;
  subject: string;
  body: string;
  contextSummary: string;
}

export interface EmailResponse {
  status: 'queued' | 'failed';
  messageId: string;
  willSend: boolean;
  note: string;
}

export type AudienceType = 'recruiter' | 'client' | 'peer' | 'executive' | 'unknown';
