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
        'fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg transition-all duration-300',
        'bg-zinc-900 text-white hover:bg-zinc-800',
        'dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      )}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
