export default function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3">
        <div className="flex gap-1">
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
