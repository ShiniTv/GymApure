import { Avatar, Badge, Button, Card } from '../../components/ui';
import { OnboardingStatus } from '../../components/members/OnboardingStatus';
import { cn } from '../../lib/utils';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import { SHIFT_SHORT_LABELS } from '../../lib/trainingShift';
import type { Member } from '../../hooks/queries/useMembersQuery';
import { X, type LucideIcon } from 'lucide-react';

export interface MemberQuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Cliente',
  trainer: 'Entrenador',
  receptionist: 'Recepción',
  admin: 'Admin',
};

interface MemberDetailPanelProps {
  member: Member;
  alertDays: number;
  actions: MemberQuickAction[];
  onClose?: () => void;
  /** When true, action click does not call onClose first (rail keeps selection). */
  keepOpenOnAction?: boolean;
  /** Show name/avatar header (desktop rail). Modal already has a title. */
  showHeader?: boolean;
  className?: string;
}

/** Shared member detail body for mobile modal and desktop rail. */
export function MemberDetailPanel({
  member,
  alertDays,
  actions,
  onClose,
  keepOpenOnAction = false,
  showHeader = false,
  className,
}: MemberDetailPanelProps) {
  const expiryBadge =
    member.role === 'member' && member.membership_name
      ? getExpiryBadgeInfo(member.days_remaining, alertDays)
      : null;

  const primary = actions.find((a) => a.primary && !a.danger) ?? null;
  const secondary = actions.filter((a) => !a.danger && !a.primary);
  const danger = actions.filter((a) => a.danger);

  const run = (action: MemberQuickAction) => {
    if (!keepOpenOnAction) onClose?.();
    action.onClick();
  };

  const metaRows: { label: string; value: string }[] = [
    { label: 'Rol', value: ROLE_LABELS[member.role] ?? member.role },
    { label: 'Cédula', value: member.cedula || '—' },
    { label: 'Email', value: member.email || '—' },
  ];
  if (member.phone) metaRows.push({ label: 'Teléfono', value: member.phone });
  if (member.training_shift) {
    metaRows.push({ label: 'Turno', value: SHIFT_SHORT_LABELS[member.training_shift] });
  }
  if (member.membership_name) {
    metaRows.push({
      label: 'Plan',
      value:
        member.days_remaining != null
          ? `${member.membership_name} · ${member.days_remaining}d`
          : member.membership_name,
    });
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {showHeader ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={member.full_name} size="sm" className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                {member.full_name}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {ROLE_LABELS[member.role] ?? member.role}
              </p>
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Cerrar ficha"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={member.status === 'active' ? 'success' : 'danger'} className="text-[10px]">
          {member.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
        {member.subscription_status === 'paused' && (
          <Badge variant="warning" className="text-[10px]">
            Pausada
          </Badge>
        )}
        {expiryBadge && (
          <Badge className={cn('text-[10px]', expiryBadge.className)}>{expiryBadge.label}</Badge>
        )}
        <OnboardingStatus onboarding={member.onboarding} variant="chip" />
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {metaRows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <dt className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {row.label}
            </dt>
            <dd className="mt-0.5 truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {primary && (
        <Button type="button" className="mt-3.5 h-11 min-h-11 w-full" onClick={() => run(primary)}>
          <primary.icon className="h-4 w-4" aria-hidden />
          {primary.label}
        </Button>
      )}

      {secondary.length > 0 && (
        <ul
          className={cn(
            'mt-2 grid gap-1.5',
            secondary.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          )}
        >
          {secondary.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                onClick={() => run(action)}
                className="flex min-h-[3.25rem] w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-xl bg-zinc-50 px-2 py-2 text-center text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-[0.98] dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <action.icon
                  className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
                  aria-hidden
                />
                <span className="text-[11px] leading-tight font-semibold">{action.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {danger.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          {danger.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => run(action)}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl py-2 text-[13px] font-medium text-red-600 dark:text-red-400"
            >
              <action.icon className="h-4 w-4 shrink-0" aria-hidden />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MemberDetailRailProps {
  member: Member;
  alertDays: number;
  actions: MemberQuickAction[];
  onClose: () => void;
}

export function MemberDetailRail({ member, alertDays, actions, onClose }: MemberDetailRailProps) {
  return (
    <Card
      padding="sm"
      rounded="xl"
      className="sticky top-3 hidden max-h-[calc(100vh-6rem)] overflow-y-auto md:block"
    >
      <MemberDetailPanel
        member={member}
        alertDays={alertDays}
        actions={actions}
        onClose={onClose}
        showHeader
        keepOpenOnAction
      />
    </Card>
  );
}
