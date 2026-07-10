import { ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui';
import { getDemoRequestPath, getDemoWhatsAppUrl } from '../../config/landingContact';
import { cn } from '../../lib/utils';

interface LandingDemoCtaProps {
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'column';
  showLogin?: boolean;
  className?: string;
  align?: 'center' | 'start';
}

export function LandingDemoCta({
  size = 'lg',
  layout = 'row',
  showLogin = true,
  className,
  align = 'center',
}: LandingDemoCtaProps) {
  const whatsappUrl = getDemoWhatsAppUrl();
  const buttonWidth = 'w-full min-w-0 sm:w-auto sm:min-w-[11.5rem]';

  return (
    <div
      className={cn(
        'flex w-full max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-3',
        align === 'start' ? 'sm:justify-start' : 'sm:justify-center',
        layout === 'column' && 'sm:flex-col sm:items-stretch',
        align === 'start' && layout !== 'column' && 'mx-0 lg:mx-0',
        align === 'center' && 'mx-auto',
        className
      )}
    >
      <Link to={getDemoRequestPath()} className="inline-flex w-full sm:w-auto">
        <Button size={size} className={buttonWidth}>
          Solicitar demo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full sm:w-auto"
        >
          <Button size={size} variant="secondary" className={buttonWidth}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </a>
      )}

      {showLogin && (
        <Link to="/login" className="inline-flex w-full sm:w-auto">
          <Button size={size} variant="ghost" className={buttonWidth}>
            Iniciar sesión
          </Button>
        </Link>
      )}
    </div>
  );
}
