/**
 * Generate a user-friendly guardrail error message
 */
export function getGuardrailErrorMessage(reason?: string, category?: string): string {
  return `I cannot answer this because ${reason || "it violates what this app is for"}. I'm focused on discussing Clay Palumbo's professional background, experience, and technical expertise. I can help with topics like his work at Slalom, software engineering projects, consulting experience, and technology skills. Please ask about these areas instead.

Guardrail Broken: ${category || "UNKNOWN"}`;
}
