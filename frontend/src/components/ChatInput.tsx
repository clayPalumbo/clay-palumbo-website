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
    <div className="flex gap-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Ask me anything about Clay..."
        disabled={disabled}
        rows={1}
        className="flex-1 px-5 py-3.5 bg-white/[0.05] border border-white/[0.12] rounded-[16px] text-white text-[15px] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-transparent resize-none disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        style={{
          minHeight: '52px',
          maxHeight: '200px',
        }}
      />

      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="px-6 py-3.5 bg-[#007AFF] hover:bg-[#0051D5] active:scale-95 rounded-[16px] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#007AFF] disabled:active:scale-100 shadow-lg shadow-blue-500/25"
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
