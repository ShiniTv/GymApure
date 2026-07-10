import { Clock, MessageCircle, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui';
import { LANDING_CARD, LANDING_EYEBROW } from './landingStyles';
import { getDemoWhatsAppUrl } from '../../config/landingContact';
import { cn } from '../../lib/utils';

const BENEFITS = [
  {
    icon: Sparkles,
    title: 'Demo personalizada',
    description: 'Te mostramos panel admin, recepción y reportes con tu operación en mente.',
  },
  {
    icon: Clock,
    title: 'Respuesta en 1–2 días',
    description: 'Revisamos tu solicitud y te contactamos por el canal que prefieras.',
  },
  {
    icon: Shield,
    title: 'Datos protegidos',
    description: 'Solo usamos tu información para coordinar la demo. Sin spam ni reventa.',
  },
] as const;

export function DemoRequestSidebar({ className }: { className?: string }) {
  const whatsappUrl = getDemoWhatsAppUrl();

  return (
    <aside className={cn('space-y-4 lg:sticky lg:top-28', className)}>
      <div className={cn(LANDING_CARD, 'p-5 sm:p-6')}>
        <p className={LANDING_EYEBROW}>Qué incluye</p>
        <ul className="mt-4 space-y-4">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-3">
              <span className="bg-brand/10 text-brand inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {whatsappUrl && (
        <div className={cn(LANDING_CARD, 'p-5 sm:p-6')}>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            ¿Prefieres WhatsApp?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Escríbenos directamente si necesitas una respuesta más rápida.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex"
          >
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
          </a>
        </div>
      )}

      <p className="px-1 text-center text-xs text-zinc-500 lg:text-left dark:text-zinc-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-brand font-medium hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </aside>
  );
}
