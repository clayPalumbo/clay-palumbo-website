import { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { sendChatMessageStreaming } from '../api/client';
import type { Message } from '../types';
import clayHeadshot from '../assets/clay-head-shot.jpeg';

interface ChatContainerProps {
  initialMessages?: Message[];
}

const STARTER_PROMPTS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    text: "AI & Software Engineering Experience",
    prompt: "Tell me about Clay's experience with AI and Software Engineering"
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    text: "Team Building",
    prompt: "What's Clay's approach to building and leading engineering teams?"
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    text: "Multi-Agent Systems",
    prompt: "How do you approach designing multi-agent systems in the enterprise?"
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
    text: "About This Site",
    prompt: "Tell me about how this website was built and the technology behind it"
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
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {isEmpty ? (
        // Empty state: centered input with starters below
        <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in">
          <div className="w-full max-w-3xl space-y-4">
            <div className="flex justify-center mb-6">
              <img
                src={clayHeadshot}
                alt="Clay Palumbo"
                className="w-24 h-24 rounded-full object-cover border-2 border-white/[0.15]"
              />
            </div>
            <h2 className="text-[32px] tracking-tight text-white text-center mb-2">
              What do you want to know about Clay?
            </h2>
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />

            {/* Conversation starters */}
            <div className="flex flex-col pt-2">
              {STARTER_PROMPTS.map((starter, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(starter.prompt)}
                  disabled={isLoading}
                  className={`group px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${index !== STARTER_PROMPTS.length - 1 ? 'border-b border-white/[0.08]' : ''
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{starter.icon}</span>
                    <span className="text-[13px] font-normal text-gray-400 group-hover:text-gray-300 transition-colors text-left leading-snug">
                      {starter.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Chat mode: messages + input at bottom
        <>
          <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6">
            <div className="max-w-3xl mx-auto">
              <MessageList messages={messages} isLoading={isLoading} />
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-white/[0.08] px-4 py-4">
            <div className="max-w-3xl mx-auto">
              <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
