import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import type { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-[15px] font-light">Start a conversation by sending a message below</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
    </>
  );
}
