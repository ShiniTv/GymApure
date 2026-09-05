import { Avatar, Badge, Button, Card } from '../../components/ui';
import { OnboardingStatus } from '../../components/members/OnboardingStatus';
import { OperateIcon } from '../../components/operate/OperateIcon';
import { cn } from '../../lib/utils';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import { SHIFT_SHORT_LABELS } from '../../lib/trainingShift';
import type { Member } from '../../hooks/queries/useMembersQuery';
import { ChevronRight, X, type LucideIcon } from 'lucide-react';

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
              <p className="text-text truncate text-sm font-semibold tracking-[-0.011em]">
                {member.full_name}
              </p>
              <p className="text-text-muted text-small">
                {ROLE_LABELS[member.role] ?? member.role}
              </p>
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors"
              aria-label="Cerrar ficha"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={member.status === 'active' ? 'success' : 'danger'} className="text-small">
          {member.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
        {member.subscription_status === 'paused' && (
          <Badge variant="warning" className="text-small">
            Pausada
          </Badge>
        )}
        {expiryBadge && (
          <Badge className={cn('text-small', expiryBadge.className)}>{expiryBadge.label}</Badge>
        )}
        <OnboardingStatus onboarding={member.onboarding} variant="chip" />
      </div>

      <dl className="border-border/80 bg-surface mt-3 overflow-hidden rounded-[var(--radius-card)] border">
        {metaRows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              'flex min-h-11 items-center justify-between gap-3 px-3 py-2',
              index > 0 && 'border-border/60 border-t'
            )}
          >
            <dt className="text-text-muted text-small shrink-0 font-medium">{row.label}</dt>
            <dd className="text-text min-w-0 truncate text-right text-sm font-medium tracking-[-0.011em]">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {primary && (
        <Button
          type="button"
          size="md"
          className="mt-3.5 w-full gap-2"
          onClick={() => run(primary)}
        >
          <primary.icon className="operate-icon h-4 w-4" aria-hidden />
          {primary.label}
        </Button>
      )}

      {secondary.length > 0 && (
        <ul className="border-border/80 bg-surface mt-2 overflow-hidden rounded-[var(--radius-card)] border">
          {secondary.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                onClick={() => run(action)}
                className="tap-feedback border-border/60 hover:bg-surface-raised/80 flex min-h-[var(--touch-min)] w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0"
              >
                <OperateIcon icon={action.icon} tone="neutral" well size="sm" />
                <span className="text-text min-w-0 flex-1 text-sm font-medium tracking-[-0.011em]">
                  {action.label}
                </span>
                <ChevronRight
                  className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-50"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {danger.length > 0 && (
        <div className="border-border/70 mt-3 border-t pt-2">
          {danger.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => run(action)}
              className="text-danger dark:text-danger tap-feedback hover:bg-danger/10 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors"
            >
              <OperateIcon icon={action.icon} tone="danger" size="sm" />
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
