import { CheckCircle } from 'lucide-react';
import { Button, Modal } from '../../components/ui';
import { formatWorkoutTime } from './utils';

export function FinishWorkoutModal({
  open,
  timer,
  completedCount,
  totalExercises,
  completedSets,
  totalVolumeKg,
  finishError,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  timer: number;
  completedCount: number;
  totalExercises: number;
  completedSets: number;
  totalVolumeKg: number;
  finishError: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (success: boolean) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (isSubmitting) return;
        onClose();
      }}
      title={<>¡Felicidades!</>}
    >
      <div className="mb-5 text-center">
        <div className="brand-solid ring-brand/10 animate-success-pop mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ring-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <p className="text-text text-sm font-semibold">¿Completaste tu rutina exitosamente?</p>
        <div className="text-small mt-3 flex items-center justify-center gap-2">
          <span className="bg-brand/10 text-brand rounded-full px-2.5 py-1 font-semibold">
            {formatWorkoutTime(timer)}
          </span>
          <span className="bg-surface-overlay text-text-secondary rounded-full px-2.5 py-1 font-medium">
            {completedCount}/{totalExercises} ejercicios
          </span>
        </div>
        <div className="border-border bg-surface-raised/80 mt-3 rounded-xl border px-3 py-2">
          <p className="text-text-secondary text-small font-medium">
            {completedSets} serie{completedSets === 1 ? '' : 's'} registradas
            <span className="text-text-muted mx-2">·</span>
            {totalVolumeKg.toLocaleString('es-VE')} kg de volumen total
          </p>
        </div>
      </div>

      {finishError && (
        <p className="text-danger mb-4 text-center text-sm font-bold">{finishError}</p>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onConfirm(true)}
          disabled={isSubmitting}
          className="group flex w-full items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 transition-all hover:border-emerald-500 disabled:opacity-60 dark:border-emerald-500/25 dark:bg-emerald-500/10"
        >
          <div className="text-left">
            <p className="font-semibold text-emerald-600 dark:text-emerald-500">Sí, la logré</p>
            <p className="mt-0.5 text-xs font-medium text-emerald-600/65 dark:text-emerald-500/65">
              Todas las series completadas
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 transition-all group-hover:bg-emerald-500 group-hover:text-white">
            <CheckCircle className="h-4 w-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onConfirm(false)}
          disabled={isSubmitting}
          className="group border-border bg-surface-raised hover:border-border flex w-full items-center justify-between rounded-xl border px-4 py-4 transition-all disabled:opacity-60"
        >
          <div className="text-left">
            <p className="text-text-secondary font-semibold">No completamente</p>
            <p className="text-text-muted mt-0.5 text-xs font-medium">
              Faltaron algunos ejercicios
            </p>
          </div>
          <div className="bg-surface-overlay group-hover:bg-text-muted h-2.5 w-2.5 rounded-full transition-all" />
        </button>

        <Button
          variant="secondary"
          className="mt-1 w-full"
          size="sm"
          disabled={isSubmitting}
          onClick={onClose}
        >
          Volver al entrenamiento
        </Button>
      </div>
    </Modal>
  );
}

export function ResetWorkoutModal({
  open,
  isResetting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  isResetting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Descartar y reiniciar">
      <p className="text-text-secondary mb-6 text-sm">
        Se eliminará esta sesión incompleta (no quedará en el historial) y podrás empezar de cero.
      </p>
      <div className="flex gap-4">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isResetting}>
          Cancelar
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={isResetting}>
          {isResetting ? 'Reiniciando…' : 'Descartar y reiniciar'}
        </Button>
      </div>
    </Modal>
  );
}
