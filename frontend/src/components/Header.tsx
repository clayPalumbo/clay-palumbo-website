export default function Header() {
  return (
    <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Clay Palumbo
            </h1>
            <p className="text-sm text-gray-400">Engineering Leader & Product Builder</p>
          </div>

          <nav className="flex gap-6 text-sm">
            <a href="#about" className="text-gray-300 hover:text-white transition-colors">
              About
            </a>
            <a href="#experience" className="text-gray-300 hover:text-white transition-colors">
              Experience
            </a>
            <a href="#chat" className="text-gray-300 hover:text-white transition-colors">
              Chat
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
