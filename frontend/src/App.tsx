import { useState, useEffect } from 'react';
import ChatContainer from './components/ChatContainer';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import type { Message } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // Hide welcome screen after first message
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages]);

  const handleStartChat = (starterPrompt?: string) => {
    setShowWelcome(false);
    if (starterPrompt) {
      // Trigger a message send with the starter prompt
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: starterPrompt,
        timestamp: new Date(),
      };
      setMessages([newMessage]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {showWelcome ? (
          <WelcomeScreen onStartChat={handleStartChat} />
        ) : (
          <ChatContainer initialMessages={messages} />
        )}
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} Clay Palumbo. Built with Strands + AWS AgentCore.</p>
      </footer>
    </div>
  );
}

export default App;
