import { Trophy, Share2, Flame, Check } from 'lucide-react';
import { useState } from 'react';
import { Modal, Button } from '../ui';
import { hapticSuccess } from '../../lib/haptics';

interface WorkoutPRCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  previous1Rm?: number;
  new1Rm: number;
  weight: number;
  reps: number;
  userName?: string;
}

export function WorkoutPRCelebrationModal({
  open,
  onClose,
  exerciseName,
  previous1Rm = 0,
  new1Rm,
  weight,
  reps,
  userName = 'Atleta GymApure',
}: WorkoutPRCelebrationModalProps) {
  const [copied, setCopied] = useState(false);
  const gain = previous1Rm > 0 ? Math.round((new1Rm - previous1Rm) * 10) / 10 : 0;

  const handleShareWhatsApp = () => {
    hapticSuccess();
    const text =
      `🏆 *¡NUEVO RÉCORD PERSONAL (PR) en GymApure!* 🏆\n\n` +
      `👤 *Atleta:* ${userName}\n` +
      `🏋️ *Ejercicio:* ${exerciseName}\n` +
      `🔥 *Carga:* ${weight} kg × ${reps} reps\n` +
      `⚡ *1RM Estimado:* ${new1Rm} kg ${gain > 0 ? `(+${gain} kg)` : ''}\n\n` +
      `_Entrenando fuerte en GymApure._ 🚀`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopy = async () => {
    hapticSuccess();
    const text = `🏆 ¡Nuevo PR en GymApure! ${exerciseName}: ${weight}kg x ${reps} reps (1RM est: ${new1Rm}kg)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not allowed
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={<>¡Nuevo Récord Personal!</>}>
      <div className="space-y-4">
        {/* Apple Fitness Style Glassmorphic Trophy Card */}
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent p-5 text-center shadow-lg">
          <div className="animate-pop-in mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-md">
            <Trophy className="h-7 w-7 stroke-[2.5]" />
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Flame className="h-3.5 w-3.5" />
            ¡SUPERASTE TU MARCA!
          </span>

          <h3 className="text-text mt-2 truncate text-lg font-bold">{exerciseName}</h3>

          <div className="border-border/60 mt-4 grid grid-cols-2 gap-3 border-t pt-4">
            <div className="bg-surface-raised/80 rounded-lg p-2.5">
              <p className="text-small text-text-muted font-medium">Serie Realizada</p>
              <p className="text-text mt-0.5 text-base font-bold tabular-nums">
                {weight} kg × {reps} reps
              </p>
            </div>
            <div className="bg-surface-raised/80 rounded-lg p-2.5">
              <p className="text-small text-text-muted font-medium">1RM Estimado</p>
              <div className="mt-0.5 flex items-center justify-center gap-1">
                <span className="text-brand text-base font-bold tabular-nums">{new1Rm} kg</span>
                {gain > 0 && (
                  <span className="text-xs font-semibold text-emerald-500 tabular-nums">
                    (+{gain})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
            size="lg"
          >
            <Share2 className="mr-1.5 h-4 w-4" />
            Compartir en WhatsApp
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="flex-1 font-semibold"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                  Copiado
                </>
              ) : (
                'Copiar texto'
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
