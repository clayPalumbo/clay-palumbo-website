import { useState, useEffect } from 'react';

export default function ScrollDownButton() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Hide button once user scrolls down more than 100px
      if (window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="flex justify-center pb-12 md:ml-20">
      <button
        onClick={() => {
          const aboutSection = document.getElementById('about');
          if (aboutSection) {
            const offset = 80; // Offset to account for padding/margin
            const elementPosition = aboutSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }}
        className="group flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
        aria-label="Scroll to About section"
      >
        <span className="text-xs font-light">Learn more</span>
        <div className="animate-bounce-gentle">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>
    </div>
  );
}
