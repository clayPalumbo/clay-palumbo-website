export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-[18px] px-5 py-3.5">
        <div className="flex gap-1.5">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-typing"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-typing"
            style={{ animationDelay: '200ms' }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-typing"
            style={{ animationDelay: '400ms' }}
          />
        </div>
      </div>
    </div>
  );
}
