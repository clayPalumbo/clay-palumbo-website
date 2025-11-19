/**
 * Knowledge Base Service - Handles RAG retrieval from Amazon Bedrock Knowledge Base
 */

import { BedrockAgentRuntimeClient, RetrieveCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { KNOWLEDGE_BASE_ID, KNOWLEDGE_BASE_CONFIG, AWS_REGION } from '../config';

export class KnowledgeBaseService {
  private client: BedrockAgentRuntimeClient;

  constructor() {
    this.client = new BedrockAgentRuntimeClient({ region: AWS_REGION });
  }

  /**
   * Retrieve relevant context from the knowledge base using RAG
   */
  async retrieve(query: string): Promise<string> {
    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        retrievalQuery: {
          text: query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: KNOWLEDGE_BASE_CONFIG.numberOfResults,
          },
        },
      });

      const response = await this.client.send(command);

      if (!response.retrievalResults || response.retrievalResults.length === 0) {
        console.log('No results found in knowledge base for query:', query);
        return '';
      }

      // Combine retrieved chunks into formatted context
      const context = response.retrievalResults
        .map((result, index) => {
          const text = result.content?.text || '';
          const score = result.score || 0;
          return `[Source ${index + 1}, Relevance: ${score.toFixed(2)}]\n${text}`;
        })
        .join('\n\n');

      console.log(`Retrieved ${response.retrievalResults.length} chunks from knowledge base`);
      return context;
    } catch (error) {
      console.error('Error retrieving from knowledge base:', error);
      // Fail gracefully - continue without KB context
      return '';
    }
  }

  /**
   * Augment system prompt with retrieved context
   */
  augmentSystemPrompt(basePrompt: string, context: string): string {
    if (!context) {
      return basePrompt;
    }

    return `${basePrompt}

<retrieved_context>
The following information was retrieved from Clay Palumbo's portfolio knowledge base and may be relevant to answering the user's question:

${context}
</retrieved_context>

Use the above context to provide accurate, specific answers about Clay's experience, projects, and background. If the context doesn't contain relevant information, rely on the general information in your system prompt.`;
  }
}
