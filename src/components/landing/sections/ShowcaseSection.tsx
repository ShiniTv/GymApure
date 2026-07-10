import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, Fingerprint, FileSpreadsheet } from 'lucide-react';
import { ScrollReveal } from '../ScrollReveal';
import { ProductMockupFrame } from '../ProductMockupFrame';
import { AdminPanelMockup } from '../mockups/AdminPanelMockup';
import { ReceptionPanelMockup } from '../mockups/ReceptionPanelMockup';
import { ReportsPanelMockup } from '../mockups/ReportsPanelMockup';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { useLandingPreview } from '../useLandingPreview';
import {
  toLandingShowcaseStatic,
  toLandingShowcaseIllustration,
} from '../../../config/landingShowcase';
import { landingSectionClass, LANDING_CONTAINER_MD } from '../landingStyles';
import { cn } from '../../../lib/utils';
import type { LandingShowcaseData } from '../../../config/landingShowcase';

const SHOWCASES = [
  {
    id: 'panel',
    label: 'Panel admin',
    shortLabel: 'Panel',
    icon: LayoutDashboard,
    url: 'gymapure.app/panel',
    title: 'Vista general del negocio',
    description: 'KPIs, ingresos y alertas operativas en un solo vistazo.',
  },
  {
    id: 'reception',
    label: 'Recepción',
    shortLabel: 'Recepción',
    icon: Fingerprint,
    url: 'gymapure.app/reception',
    title: 'Mostrador en tiempo real',
    description: 'Check-in por cédula, estado de membresía y acceso al instante.',
  },
  {
    id: 'reports',
    label: 'Reportes',
    shortLabel: 'Reportes',
    icon: FileSpreadsheet,
    url: 'gymapure.app/reports',
    title: 'Supervisión y exportación',
    description: 'Pagos, asistencias y miembros listos para analizar o exportar.',
  },
] as const;

type ShowcaseId = (typeof SHOWCASES)[number]['id'];

function renderMockup(id: ShowcaseId, data: LandingShowcaseData) {
  switch (id) {
    case 'panel':
      return <AdminPanelMockup data={data.admin} />;
    case 'reception':
      return <ReceptionPanelMockup data={data.reception} />;
    case 'reports':
      return <ReportsPanelMockup data={data.reports} />;
  }
}

export function ShowcaseSection() {
  const [active, setActive] = useState<ShowcaseId>('panel');
  const prefersReducedMotion = useReducedMotion();
  const {
    data: preview = import.meta.env.PROD
      ? toLandingShowcaseIllustration()
      : toLandingShowcaseStatic(),
  } = useLandingPreview();
  const current = SHOWCASES.find((s) => s.id === active) ?? SHOWCASES[0];

  return (
    <section id="vista-previa" className={landingSectionClass()}>
      <div className={LANDING_CONTAINER_MD}>
        <LandingSectionHeader
          eyebrow="Vista previa"
          title="Así se ve en operación"
          subtitle={
            import.meta.env.PROD
              ? 'Interfaces del sistema: panel administrativo, recepción y reportes.'
              : 'Interfaces del sistema con datos de demostración: panel administrativo, recepción y reportes.'
          }
        >
          {preview.source === 'live' && (
            <p className="text-brand mt-2 text-[10px] font-semibold tracking-wide uppercase sm:text-xs">
              Datos en vivo desde tu entorno local
            </p>
          )}
          {preview.source === 'illustration' && (
            <p className="mt-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase sm:text-xs dark:text-zinc-400">
              Vista ilustrativa — datos de ejemplo
            </p>
          )}
        </LandingSectionHeader>

        <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:mt-10 sm:overflow-visible sm:px-0">
          <div className="flex w-max min-w-full gap-2 pb-1 sm:w-auto sm:min-w-0 sm:flex-wrap sm:justify-center">
            {SHOWCASES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors sm:px-4',
                  active === item.id
                    ? 'border-brand/40 bg-brand/10 text-brand'
                    : 'hover:border-brand/20 hover:text-brand border-zinc-200/80 bg-white/60 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400'
                )}
                aria-pressed={active === item.id}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
          <ScrollReveal className="order-2 text-center lg:order-1 lg:text-left">
            <h3 className="text-lg font-bold text-zinc-900 sm:text-xl md:text-2xl dark:text-white">
              {current.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
              {current.description}
            </p>
          </ScrollReveal>

          <div className="order-1 lg:order-2">
            {prefersReducedMotion ? (
              <ProductMockupFrame url={current.url}>
                {renderMockup(current.id, preview)}
              </ProductMockupFrame>
            ) : (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <ProductMockupFrame url={current.url}>
                  {renderMockup(current.id, preview)}
                </ProductMockupFrame>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
