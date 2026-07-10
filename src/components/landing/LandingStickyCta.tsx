import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { getDemoRequestPath } from '../../config/landingContact';
import { cn } from '../../lib/utils';

export function LandingStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const contact = document.getElementById('contacto');

    const onScroll = () => {
      setVisible(window.scrollY > 480);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!contact) {
      return () => window.removeEventListener('scroll', onScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(false);
        } else if (window.scrollY > 480) {
          setVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(contact);

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden',
        'pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
      aria-hidden={!visible}
    >
      <div className="pointer-events-auto border-t border-zinc-200/60 bg-zinc-50/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-zinc-950/95">
        <Link to={getDemoRequestPath()} className="block">
          <Button className="shadow-brand/20 w-full shadow-lg">
            Solicitar demo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
