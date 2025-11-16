import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Ask me anything..."
        disabled={disabled}
        rows={1}
        className="w-full px-5 py-3.5 pr-14 bg-white/[0.05] border border-white/[0.12] rounded-[24px] text-white text-[15px] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/[0.2] focus:border-transparent resize-none disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        style={{
          minHeight: '52px',
          maxHeight: '200px',
        }}
      />

      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[rgb(96,165,250)]/[0.5] hover:bg-[rgb(96,165,250)]/[0.75] active:scale-95 rounded-full font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[rgb(96,165,250)]/[0.15] disabled:active:scale-100"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </div>
  );
}
