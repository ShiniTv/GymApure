import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Volver arriba"
      className={cn(
        'scroll-to-top-btn bg-text text-bg can-hover:hover:opacity-90 fixed right-6 bottom-6 z-50 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-[opacity,transform] duration-200 [transition-timing-function:var(--ease-out)]',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      )}
    >
      <ChevronUp className="h-4 w-4" />
    </button>
  );
}
