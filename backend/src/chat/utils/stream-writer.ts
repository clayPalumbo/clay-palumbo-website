/**
 * Stream Writer Utility - Handles writing SSE events to response stream
 */

import { StreamEvent } from '../types';

export class StreamWriter {
  /**
   * Write a JSON event to the stream in SSE format
   */
  static write(stream: NodeJS.WritableStream, event: StreamEvent): void {
    stream.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  /**
   * Write session event
   */
  static writeSession(stream: NodeJS.WritableStream, sessionId: string): void {
    this.write(stream, { type: 'session', sessionId });
  }

  /**
   * Write content event
   */
  static writeContent(stream: NodeJS.WritableStream, text: string): void {
    this.write(stream, { type: 'content', text });
  }

  /**
   * Write done event
   */
  static writeDone(stream: NodeJS.WritableStream): void {
    this.write(stream, { type: 'done' });
  }

  /**
   * Write error event
   */
  static writeError(stream: NodeJS.WritableStream, error: string, message?: string): void {
    this.write(stream, { type: 'error', error, message });
  }

  /**
   * End the stream
   */
  static end(stream: NodeJS.WritableStream): void {
    stream.end();
  }
}
