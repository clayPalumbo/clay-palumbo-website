import { useRef } from 'react';
import ChatContainer from './components/ChatContainer';
import Sidenav from './components/Sidenav';
import PointCloudBackground from './components/PointCloudBackground';
import About from './components/About';
import Experience from './components/Experience';
import ScrollDownButton from './components/ScrollDownButton';

export interface ChatContainerRef {
  clearChat: () => void;
}

function App() {
  const chatContainerRef = useRef<ChatContainerRef>(null);

  const handleClearChat = () => {
    chatContainerRef.current?.clearChat();
    // Scroll to chat section
    document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-white">
      <PointCloudBackground />

      <Sidenav onClearChat={handleClearChat} />

      <main id="chat" className="container mx-auto px-2 md:px-6 py-4 md:py-12 pt-16 md:pt-20 max-w-6xl">
        <ChatContainer ref={chatContainerRef} />

        <ScrollDownButton />
      </main>

      {/* About Section */}
      <div className="md:ml-20">
        <About />
      </div>

      {/* Experience Section */}
      <div className="md:ml-20">
        <Experience />
      </div>

      <footer className="text-center py-8 text-gray-500 text-sm font-light md:ml-20">
        <p>© {new Date().getFullYear()} Clay Palumbo</p>
      </footer>

    </div>
  );
}

export default App;
