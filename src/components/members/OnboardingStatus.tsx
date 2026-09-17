import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MemberOnboarding {
  has_trainer_assignment: boolean;
  has_active_routine: boolean;
}

interface OnboardingStatusProps {
  onboarding?: MemberOnboarding | null;
  /** @deprecated Prefer `variant` — maps to `compact` / `default`. */
  compact?: boolean;
  /**
   * `chip` — quiet list signal (count only).
   * `compact` — one-line detail (sheets).
   * `default` — bordered callout.
   */
  variant?: 'default' | 'compact' | 'chip';
}

function pendingLabels(onboarding: MemberOnboarding): string[] {
  return [
    !onboarding.has_trainer_assignment && 'entrenador',
    !onboarding.has_active_routine && 'rutina',
  ].filter(Boolean) as string[];
}

export function OnboardingStatus({ onboarding, compact = false, variant }: OnboardingStatusProps) {
  if (!onboarding) return null;

  const pending = pendingLabels(onboarding);
  if (pending.length === 0) return null;

  const mode = variant ?? (compact ? 'compact' : 'default');
  const detail = pending.join(', ');

  if (mode === 'chip') {
    return (
      <span
        className="text-small bg-warning/10 text-warning inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
        title={`Pendiente: ${detail}`}
      >
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
        {pending.length === 1 ? '1 pendiente' : `${pending.length} pendientes`}
      </span>
    );
  }

  if (mode === 'compact') {
    return (
      <div
        className="text-small text-warning flex items-center gap-1.5 font-medium"
        title={`Pendiente: ${detail}`}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
        <span>
          <strong>Pendiente:</strong> {detail}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-warning/20 bg-warning/5 text-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-xs'
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong>Pendiente:</strong> {detail}
      </span>
    </div>
  );
}
