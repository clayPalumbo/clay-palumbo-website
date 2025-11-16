import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={clsx(
        'flex animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[75%] rounded-[18px] px-5 py-3.5',
          isUser
            ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20'
            : 'bg-white/[0.06] text-white border border-white/[0.08]'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-normal">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&>p]:text-[15px] [&>p]:leading-relaxed [&>p]:font-normal [&>p]:text-gray-200 [&>ul]:text-[15px] [&>ol]:text-[15px] [&>li]:text-gray-200">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        <div
          className={clsx(
            'text-[11px] mt-2 font-light',
            isUser ? 'text-white/60' : 'text-gray-500'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
