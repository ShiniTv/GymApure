import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionItem } from '../../ui/Accordion';
import { ScrollReveal } from '../ScrollReveal';
import { LandingSectionHeader } from '../LandingSectionHeader';
import { landingSectionClass, LANDING_CONTAINER_SM } from '../landingStyles';

const FAQ_ITEMS = [
  {
    question: '¿Funciona sin internet?',
    answer:
      'La operación diaria (check-in, pagos, panel) requiere conexión para sincronizar en tiempo real. Algunas vistas del portal de miembros toleran cortes breves si ya cargaste la sesión, pero recepción y administración están pensadas para usarse conectadas.',
  },
  {
    question: '¿Cuántos usuarios puede tener mi gym?',
    answer:
      'No hay un límite rígido en el sistema: puedes registrar administradores, recepcionistas, entrenadores y todos los miembros que necesites. Está diseñado para un gimnasio con operación de mostrador y equipo de staff.',
  },
  {
    question: '¿Tiene check-in con QR o cédula?',
    answer:
      'Sí. En recepción se busca al miembro por cédula y se registra el acceso al instante. También hay flujos de check-in con código QR según la configuración del gym.',
  },
  {
    question: '¿Puedo migrar desde Excel u otro sistema?',
    answer:
      'Puedes empezar cargando membresías y miembros desde el panel. Si ya tienes datos en hojas de cálculo, en la demo te orientamos sobre el orden recomendado para migrar sin frenar la operación del mostrador.',
  },
  {
    question: '¿Hay que instalar algo en recepción?',
    answer:
      'No. GymApure funciona en el navegador: PC, tablet o celular. Opcionalmente se puede usar como app instalable (PWA) en el dispositivo del mostrador para acceso más rápido.',
  },
] as const;

export function FaqSection() {
  return (
    <section id="preguntas" className={landingSectionClass()}>
      <div className={LANDING_CONTAINER_SM}>
        <LandingSectionHeader
          eyebrow="Preguntas frecuentes"
          title="Dudas antes de la demo"
          subtitle="Respuestas directas para dueños y administradores que evalúan el sistema."
        />

        <ScrollReveal className="mt-8 sm:mt-10">
          <Accordion>
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={item.question}
                title={item.question}
                icon={<HelpCircle className="text-brand h-4 w-4 shrink-0" aria-hidden />}
                defaultOpen={index === 0}
              >
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.answer}
                </p>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
