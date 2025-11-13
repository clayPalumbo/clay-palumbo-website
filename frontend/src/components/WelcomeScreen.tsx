interface WelcomeScreenProps {
  onStartChat: (starterPrompt?: string) => void;
}

const STARTER_PROMPTS = [
  "Tell me about Clay's experience with AI and ML systems",
  "What's Clay's approach to building engineering teams?",
  "What kind of projects has Clay worked on?",
  "I'd like to discuss a consulting opportunity",
];

export default function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center animate-fade-in">
      <div className="mb-8">
        <div className="mb-4 inline-block p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full">
          <svg
            className="w-16 h-16 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>

        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Welcome to Clay's AI Agent
        </h2>

        <p className="text-xl text-gray-300 mb-2">
          Learn about Clay's experience building AI systems, teams, and products
        </p>

        <p className="text-gray-400 max-w-2xl mx-auto">
          This AI agent knows Clay's background, approach, and work. Ask anything about his experience,
          technical skills, leadership style, or discuss potential opportunities.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-3">
        <p className="text-sm text-gray-400 mb-4">Try one of these prompts:</p>

        {STARTER_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onStartChat(prompt)}
            className="w-full text-left px-6 py-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg transition-all duration-200 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 group"
          >
            <span className="text-gray-300 group-hover:text-white transition-colors">
              {prompt}
            </span>
          </button>
        ))}

        <button
          onClick={() => onStartChat()}
          className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25"
        >
          Start Conversation
        </button>
      </div>
    </div>
  );
}
