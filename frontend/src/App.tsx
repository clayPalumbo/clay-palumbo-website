import ChatContainer from './components/ChatContainer';
import Header from './components/Header';
import PointCloudBackground from './components/PointCloudBackground';

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <PointCloudBackground />

      <Header />

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <ChatContainer />
      </main>

      <footer className="text-center py-8 text-gray-500 text-sm font-light">
        <p>© {new Date().getFullYear()} Clay Palumbo. Built with Strands + AWS AgentCore.</p>
      </footer>
    </div>
  );
}

export default App;
