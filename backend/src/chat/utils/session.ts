/**
 * Session Utility - Handles session ID generation
 */

export class SessionUtil {
  /**
   * Generate a unique session ID
   */
  static generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}
