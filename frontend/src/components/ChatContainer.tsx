import { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { sendChatMessageStreaming } from '../api/client';
import type { Message } from '../types';

interface ChatContainerProps {
  initialMessages?: Message[];
}

const STARTER_PROMPTS = [
  {
    icon: '🤖',
    text: "AI & ML Experience",
    prompt: "Tell me about Clay's experience with AI and ML systems"
  },
  {
    icon: '👥',
    text: "Team Building",
    prompt: "What's Clay's approach to building engineering teams?"
  },
  {
    icon: '🚀',
    text: "Projects",
    prompt: "What kind of projects has Clay worked on?"
  },
  {
    icon: '💼',
    text: "Consulting",
    prompt: "I'd like to discuss a consulting opportunity"
  },
];

export default function ChatContainer({ initialMessages = [] }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === initialMessages.length) {
      const lastMessage = initialMessages[initialMessages.length - 1];
      if (lastMessage.role === 'user') {
        handleSendMessage(lastMessage.content);
      }
    }
  }, []); // Only run once on mount

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create an assistant message ID that we'll update as chunks arrive
    const assistantMessageId = crypto.randomUUID();
    let assistantContent = '';

    // Add empty assistant message that we'll stream into
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Prepare chat request
      const chatRequest = {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        sessionId,
      };

      // Stream response from API
      await sendChatMessageStreaming(
        chatRequest,
        // onChunk callback - called for each piece of content
        (chunk: string) => {
          assistantContent += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: assistantContent }
                : m
            )
          );
        },
        // onSessionId callback - called when session ID is received
        (newSessionId: string) => {
          setSessionId(newSessionId);
        }
      );
    } catch (error) {
      console.error('Error sending message:', error);

      // Replace the empty assistant message with an error message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content:
                  'Sorry, I encountered an error processing your message. Please try again or contact Clay directly.',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] bg-white/[0.03] rounded-[20px] border border-white/[0.08] shadow-2xl shadow-black/50 backdrop-blur-xl">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-in">
            <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/[0.06] border border-white/[0.1]">
              <svg
                className="w-10 h-10 text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h2 className="text-[40px] font-semibold tracking-tight text-white leading-tight mb-4">
              Welcome to Clay's AI Agent
            </h2>
            <p className="text-[19px] text-gray-400 font-normal leading-relaxed mb-3 max-w-2xl">
              Learn about Clay's experience building AI systems, teams, and products
            </p>
            <p className="text-[15px] text-gray-500 font-light max-w-xl leading-relaxed">
              This AI agent knows Clay's background, approach, and work. Ask anything about his experience or discuss potential opportunities.
            </p>
          </div>
        ) : (
          <>
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input or Starter Prompts */}
      <div className="border-t border-white/[0.08] p-6 space-y-4">
        {isEmpty && (
          <div className="grid grid-cols-2 gap-3">
            {STARTER_PROMPTS.map((starter, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(starter.prompt)}
                disabled={isLoading}
                className="group relative overflow-hidden px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.15] rounded-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <div className="relative flex items-center gap-2.5">
                  <span className="text-xl">{starter.icon}</span>
                  <span className="text-[14px] font-normal text-gray-300 group-hover:text-white transition-colors text-left leading-snug">
                    {starter.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
