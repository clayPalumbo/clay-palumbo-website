/**
 * Message Formatter Utility - Converts messages to Claude format
 */

import { ChatMessage, ClaudeMessage } from '../types';

export class MessageFormatter {
  /**
   * Convert chat messages to Claude API format
   */
  static toClaudeFormat(messages: ChatMessage[]): ClaudeMessage[] {
    return messages
      .filter((msg) => msg.content && msg.content.trim().length > 0)
      .map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: [
          {
            type: 'text',
            text: msg.content,
          },
        ],
      }));
  }

  /**
   * Validate that messages array is not empty after formatting
   */
  static validate(messages: ClaudeMessage[]): boolean {
    return messages.length > 0;
  }

  /**
   * Get the latest user message from messages array
   */
  static getLatestUserMessage(messages: ChatMessage[]): ChatMessage | null {
    const userMessages = messages.filter((msg) => msg.role === 'user');
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }
}
