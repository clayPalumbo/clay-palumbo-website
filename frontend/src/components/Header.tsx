export default function Header() {
  return (
    <header className="border-b border-white/[0.08] bg-black/80 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-10">
      <div className="container mx-auto px-6 py-5 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white">
              Clay Palumbo
            </h1>
            <p className="text-[13px] text-gray-400 font-normal mt-0.5">
              Engineering Leader & Product Builder
            </p>
          </div>

          <nav className="flex gap-8 text-[15px]">
            <a
              href="#about"
              className="text-gray-400 hover:text-white transition-colors duration-200 font-normal"
            >
              About
            </a>
            <a
              href="#experience"
              className="text-gray-400 hover:text-white transition-colors duration-200 font-normal"
            >
              Experience
            </a>
            <a
              href="#chat"
              className="text-gray-400 hover:text-white transition-colors duration-200 font-normal"
            >
              Chat
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
