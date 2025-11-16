import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { clsx } from 'clsx';
import type { Message } from '../types';
import clayHeadshot from '../assets/clay-head-shot.jpeg';

interface MessageBubbleProps {
  message: Message;
  isLoading?: boolean;
}

export default function MessageBubble({ message, isLoading = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={clsx(
        'flex animate-fade-in gap-3',
        isUser ? 'justify-end' : 'justify-start items-start'
      )}
    >
      {!isUser && (
        <div className="relative flex-shrink-0">
          <img
            src={clayHeadshot}
            alt="Clay Palumbo"
            className={clsx(
              'rounded-full object-cover w-10 h-10 border-2 border-white/[0.15] transition-all duration-300',

            )}
          />
          {isLoading && (
            <>
              {/* Fast spinning outer ring with color shift */}
              <div
                className="absolute -inset-1 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: 'rgb(96, 165, 250)',
                  animation: 'spin-fast 1.2s linear infinite, color-shift 3s ease-in-out infinite',
                  borderTopWidth: '2px',
                  borderRightWidth: '2px',
                  borderRightColor: 'transparent'
                }}
              />
              {/* Medium speed middle arc */}
              <div
                className="absolute -inset-0.5 rounded-full border-2 border-transparent border-t-purple-400"
                style={{
                  animation: 'spin-slow 2s linear infinite',
                  borderTopWidth: '2px',
                  borderBottomWidth: '2px',
                  borderBottomColor: 'rgb(147, 51, 234, 0.3)'
                }}
              />
              {/* Slow spinning inner accent */}
              <div
                className="absolute -inset-0.5 rounded-full border border-transparent border-t-pink-400"
                style={{
                  animation: 'spin-fast 0.8s linear infinite',
                  borderTopWidth: '1px'
                }}
              />
            </>
          )}
        </div>
      )}
      <div
        className={clsx(
          'px-5 ',
          isUser
            ? 'py-3.5 max-w-[75%] bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 rounded-tl-[18px] rounded-bl-[18px] rounded-br-[18px]'
            : 'flex-1 text-white rounded-[18px]'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-normal">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&>p]:text-[15px] [&>p]:leading-relaxed [&>p]:font-normal [&>p]:text-gray-200 [&>ul]:text-[15px] [&>ol]:text-[15px] [&>li]:text-gray-200 [&>h1]:text-xl [&>h1]:font-semibold [&>h1]:mb-2 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mb-1 [&>a]:text-blue-400 [&>a]:underline hover:[&>a]:text-blue-300 [&>code]:bg-white/[0.1] [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:text-gray-200">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: '0.5rem 0',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
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
