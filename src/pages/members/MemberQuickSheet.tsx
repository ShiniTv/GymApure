import { Modal, Avatar, Badge, Button } from '../../components/ui';
import { OnboardingStatus } from '../../components/members/OnboardingStatus';
import { cn } from '../../lib/utils';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import type { Member } from '../../hooks/queries/useMembersQuery';
import type { LucideIcon } from 'lucide-react';

export interface MemberQuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

interface MemberQuickSheetProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  alertDays: number;
  actions: MemberQuickAction[];
}

/** Ficha rápida del miembro — modal centrado (móvil y desktop). */
export function MemberQuickSheet({
  member,
  open,
  onClose,
  alertDays,
  actions,
}: MemberQuickSheetProps) {
  if (!member) return null;

  const expiryBadge =
    member.role === 'member' && member.membership_name
      ? getExpiryBadgeInfo(member.days_remaining, alertDays)
      : null;

  const primary = actions.filter((a) => a.primary && !a.danger);
  const secondary = actions.filter((a) => !a.primary && !a.danger);
  const danger = actions.filter((a) => a.danger);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member.full_name}
      maxWidth="sm"
      scrollable
      initialFocus="dialog"
      className="mx-4"
    >
      <div className="flex items-center gap-3 pb-3">
        <Avatar name={member.full_name} size="md" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
              {member.status === 'active' ? 'Activo' : 'Inactivo'}
            </Badge>
            {member.subscription_status === 'paused' && <Badge variant="warning">Pausada</Badge>}
            {expiryBadge && (
              <Badge className={cn('text-[10px]', expiryBadge.className)}>
                {expiryBadge.label}
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {[member.cedula || 'Sin cédula', member.membership_name].filter(Boolean).join(' · ')}
            {member.membership_name != null && member.days_remaining != null
              ? ` · ${member.days_remaining}d`
              : ''}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <OnboardingStatus onboarding={member.onboarding} compact />
      </div>

      {primary.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {primary.map((action) => (
            <Button
              key={action.key}
              className="w-full justify-start"
              onClick={() => {
                onClose();
                action.onClick();
              }}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {secondary.length > 0 && (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {secondary.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  action.onClick();
                }}
                className="flex min-h-[var(--touch-min)] w-full items-center gap-3 py-2.5 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100"
              >
                <action.icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {danger.length > 0 && (
        <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          {danger.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                onClose();
                action.onClick();
              }}
              className="flex min-h-[var(--touch-min)] w-full items-center gap-3 py-2.5 text-left text-sm font-medium text-red-600 dark:text-red-400"
            >
              <action.icon className="h-4 w-4 shrink-0" aria-hidden />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
