import { AlertTriangle } from 'lucide-react';

export interface MemberOnboarding {
  has_trainer_assignment: boolean;
  has_active_routine: boolean;
  has_class_booking: boolean;
}

interface OnboardingStatusProps {
  onboarding?: MemberOnboarding | null;
  compact?: boolean;
}

export function OnboardingStatus({ onboarding, compact = false }: OnboardingStatusProps) {
  if (!onboarding) return null;

  const pending = [
    !onboarding.has_trainer_assignment && 'entrenador',
    !onboarding.has_active_routine && 'rutina',
    !onboarding.has_class_booking && 'primera clase',
  ].filter(Boolean) as string[];

  if (pending.length === 0) return null;

  return (
    <div
      className={
        compact
          ? 'flex items-center gap-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400'
          : 'flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400'
      }
    >
      <AlertTriangle className={compact ? 'h-3 w-3 shrink-0' : 'mt-0.5 h-4 w-4 shrink-0'} />
      <span>
        <strong>Pendiente:</strong> {pending.join(', ')}
      </span>
    </div>
  );
}
