import { useState } from 'react';
import clayHeadshot from '../assets/clay-head-shot.jpeg';

interface SidenavProps {
  onClearChat: () => void;
}

export default function Sidenav({ onClearChat }: SidenavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      href: "#chat",
      title: "Chat",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    },
    {
      href: "#about",
      title: "About",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      href: "#experience",
      title: "Experience",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      {!isOpen && <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/80 backdrop-blur-xl border border-white/[0.08] text-gray-400 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 " fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      }

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidenav - Desktop (always visible) / Mobile (drawer) */}
      <aside className={`
        fixed left-0 top-0 h-full w-20 bg-black/80 backdrop-blur-xl backdrop-saturate-150 border-r border-white/[0.08] z-40 flex flex-col items-center py-6
        md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-transform duration-300 ease-in-out
      `}>
        {/* Logo/Headshot */}
        <div className="mb-8">
          <img
            src={clayHeadshot}
            alt="Clay Palumbo"
            onClick={onClearChat}
            className="w-12 h-12 rounded-full object-cover border-2 border-white/[0.15] hover:border-white/[0.3] transition-all duration-200 cursor-pointer"
          />
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-6">
          {navItems.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="text-gray-400 hover:text-white transition-colors duration-200 text-[13px] font-normal"
              title={item.title}
              onClick={() => setIsOpen(false)}
            >
              {item.icon}
            </a>
          ))}
        </nav>

        {/* LinkedIn at bottom */}
        <div className="mt-auto">
          <a
            href="https://www.linkedin.com/in/clay-palumbo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors duration-200 text-[13px] font-normal"
            title="LinkedIn"
            onClick={() => setIsOpen(false)}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
      </aside>
    </>
  );
}
