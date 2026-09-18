import { CheckCircle, Share2, Flame, Clock, Dumbbell } from 'lucide-react';
import { Button, Modal } from '../ui';
import { FitnessRings } from './FitnessRings';
import { formatWorkoutTime } from '../../pages/activeWorkout/utils';
import { hapticSuccess } from '../../lib/haptics';

interface WorkoutSummaryModalProps {
  open: boolean;
  onClose: () => void;
  timer: number;
  completedCount: number;
  totalExercises: number;
  completedSets: number;
  totalVolumeKg: number;
  finishError: string | null;
  isSubmitting: boolean;
  onConfirm: (success: boolean) => void;
  routineName?: string;
  userName?: string;
}

export function WorkoutSummaryModal({
  open,
  onClose,
  timer,
  completedCount,
  totalExercises,
  completedSets,
  totalVolumeKg,
  finishError,
  isSubmitting,
  onConfirm,
  routineName = 'Rutina',
  userName = 'Atleta GymApure',
}: WorkoutSummaryModalProps) {
  const completionPct = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;
  const volumeRingPct = Math.min(100, Math.round((totalVolumeKg / 5000) * 100));
  const timeRingPct = Math.min(100, Math.round((timer / 2700) * 100)); // target ~45min

  const handleShareWhatsApp = () => {
    hapticSuccess();
    const timeFormatted = formatWorkoutTime(timer);
    const text =
      `💪 *¡ENTRENAMIENTO COMPLETADO en GymApure!* 🏋️‍♂️\n\n` +
      `👤 *Atleta:* ${userName}\n` +
      `📋 *Rutina:* ${routineName}\n` +
      `⏱️ *Tiempo:* ${timeFormatted}\n` +
      `✅ *Ejercicios:* ${completedCount}/${totalExercises} completados\n` +
      `🔢 *Series:* ${completedSets} series registradas\n` +
      `⚡ *Volumen Total:* ${totalVolumeKg.toLocaleString('es-VE')} kg movidos\n\n` +
      `_¡Constancia y disciplina en GymApure!_ 🔥`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (isSubmitting) return;
        onClose();
      }}
      title={<>Resumen de Entrenamiento</>}
    >
      <div className="space-y-4">
        {/* Apple Fitness Style Dashboard Card */}
        <div className="border-border/80 bg-surface-raised/80 relative overflow-hidden rounded-[var(--radius-card)] border p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <span className="bg-success/15 text-success inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold">
                <CheckCircle className="h-3 w-3" />
                SESIÓN FINALIZADA
              </span>
              <h3 className="text-text truncate text-base font-bold">{routineName}</h3>
              <p className="text-text-muted text-xs font-medium">
                {completedCount} de {totalExercises} ejercicios completados
              </p>
            </div>

            {/* Apple Activity Rings Mini */}
            <div className="shrink-0 scale-90">
              <FitnessRings
                workoutsProgress={completionPct}
                volumeProgress={volumeRingPct}
                consistencyProgress={timeRingPct}
                size={84}
                strokeWidth={7}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="border-border/60 mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
            <div className="bg-surface-overlay/50 rounded-lg p-2">
              <div className="text-brand mb-0.5 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <p className="text-small text-text-muted font-medium">Tiempo</p>
              <p className="text-text mt-0.5 text-xs font-bold tabular-nums">
                {formatWorkoutTime(timer)}
              </p>
            </div>

            <div className="bg-surface-overlay/50 rounded-lg p-2">
              <div className="mb-0.5 flex items-center justify-center text-emerald-500">
                <Dumbbell className="h-3.5 w-3.5" />
              </div>
              <p className="text-small text-text-muted font-medium">Series</p>
              <p className="text-text mt-0.5 text-xs font-bold tabular-nums">{completedSets}</p>
            </div>

            <div className="bg-surface-overlay/50 rounded-lg p-2">
              <div className="mb-0.5 flex items-center justify-center text-amber-500">
                <Flame className="h-3.5 w-3.5" />
              </div>
              <p className="text-small text-text-muted font-medium">Volumen</p>
              <p className="text-text mt-0.5 text-xs font-bold tabular-nums">
                {totalVolumeKg >= 1000 ? `${(totalVolumeKg / 1000).toFixed(1)}k` : totalVolumeKg} kg
              </p>
            </div>
          </div>
        </div>

        {finishError && <p className="text-danger text-center text-xs font-bold">{finishError}</p>}

        {/* Confirmation buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onConfirm(true)}
            disabled={isSubmitting}
            className="group border-success/30 bg-success/15 hover:border-success flex w-full items-center justify-between rounded-[var(--radius-card)] border px-4 py-3.5 text-left transition-all disabled:opacity-60"
          >
            <div>
              <p className="text-success text-sm font-bold">Guardar y Finalizar</p>
              <p className="text-success/80 mt-0.5 text-xs">
                Registrar en tu historial y cerrar sesión
              </p>
            </div>
            <div className="border-success text-success flex h-7 w-7 items-center justify-center rounded-full border-2">
              <CheckCircle className="h-4 w-4" />
            </div>
          </button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleShareWhatsApp}
            className="w-full font-semibold"
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            Compartir Resumen por WhatsApp
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-text-muted w-full"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Continuar editando series
          </Button>
        </div>
      </div>
    </Modal>
  );
}
