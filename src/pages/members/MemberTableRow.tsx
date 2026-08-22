import { memo } from 'react';
import { useNavigate } from 'react-router';
import {
  Dumbbell,
  History,
  MessageSquare,
  CreditCard,
  Power,
  Trash2,
  IdCard,
  UtensilsCrossed,
  Pause,
  Play,
} from 'lucide-react';
import { Badge } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, type UserRole } from '../../lib/roles';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import { SHIFT_SHORT_LABELS, SHIFT_BADGE_CLASSES } from '../../lib/trainingShift';
import type { Member } from '../../hooks/queries/useMembersQuery';
import { OnboardingStatus } from '../../components/members/OnboardingStatus';
import { memberCoachingHref } from '../../lib/trainerNeeds';

interface MemberTableRowProps {
  member: Member;
  userRole: string;
  currentUserId: number | undefined;
  isStaffMember: boolean;
  alertDays: number;
  roleBadgeClass: (role: string) => string;
  selected?: boolean;
  onSelect?: (member: Member) => void;
  onAssignSubscription: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
  onDelete: (member: Member) => void;
  onShowBadge: (member: Member) => void;
  onEditShift: (member: Member) => void;
  onMembershipOperation: (member: Member) => void;
  membershipOperationLoading: boolean;
  coachingHubTab?: string;
}

interface RowAction {
  key: string;
  label: string;
  icon: typeof Dumbbell;
  onClick: () => void;
  className?: string;
  danger?: boolean;
}

export const MemberTableRow = memo(function MemberTableRow({
  member,
  userRole,
  currentUserId,
  isStaffMember,
  alertDays,
  roleBadgeClass,
  selected = false,
  onSelect,
  onAssignSubscription,
  onToggleStatus,
  onDelete,
  onShowBadge,
  onEditShift,
  onMembershipOperation,
  membershipOperationLoading,
  coachingHubTab,
}: MemberTableRowProps) {
  const navigate = useNavigate();
  const isTrainer = userRole === 'trainer';
  const isAdmin = userRole === 'admin';
  const badgeInfo =
    member.role === 'member' && member.membership_name
      ? getExpiryBadgeInfo(member.days_remaining, alertDays)
      : null;

  const actions: RowAction[] = [];

  if (isTrainer && member.role === 'member') {
    actions.push(
      {
        key: 'routines',
        label: 'Rutinas',
        icon: Dumbbell,
        onClick: () => navigate(memberCoachingHref(member.id, coachingHubTab)),
        className: 'hover:text-brand hover:bg-brand/10',
      },
      {
        key: 'nutrition',
        label: 'Nutrición',
        icon: UtensilsCrossed,
        onClick: () => navigate(`/members/${member.id}/nutrition`),
        className: 'hover:bg-emerald-500/10 hover:text-emerald-500',
      },
      {
        key: 'message',
        label: 'Mensaje',
        icon: MessageSquare,
        onClick: () => navigate(`/messages?member=${member.id}`),
        className: 'hover:text-brand hover:bg-brand/10',
      },
      {
        key: 'history',
        label: 'Historial',
        icon: History,
        onClick: () => navigate(`/members/${member.id}/history`),
        className: 'hover:bg-blue-500/10 hover:text-blue-500',
      }
    );
  }

  if ((userRole === 'admin' || userRole === 'receptionist') && member.role === 'member') {
    actions.push(
      {
        key: 'badge',
        label: 'Carné',
        icon: IdCard,
        onClick: () => onShowBadge(member),
        className: 'hover:text-brand hover:bg-brand/10',
      },
      {
        key: 'message',
        label: 'Mensaje',
        icon: MessageSquare,
        onClick: () => navigate(`/messages?member=${member.id}`),
        className: 'hover:text-brand hover:bg-brand/10',
      },
      {
        key: 'assign',
        label: 'Membresía',
        icon: CreditCard,
        onClick: () => onAssignSubscription(member),
        className: 'hover:bg-emerald-500/10 hover:text-emerald-500',
      }
    );
    if (member.subscription_status) {
      actions.push({
        key: 'pause',
        label: member.subscription_status === 'paused' ? 'Reanudar' : 'Pausar',
        icon: member.subscription_status === 'paused' ? Play : Pause,
        onClick: () => onMembershipOperation(member),
        className: 'hover:bg-amber-500/10 hover:text-amber-500',
      });
    }
  }

  if (isAdmin && member.role === 'member') {
    actions.push({
      key: 'toggle',
      label: member.status === 'active' ? 'Desactivar' : 'Activar',
      icon: Power,
      onClick: () => onToggleStatus(member),
      className:
        member.status === 'active'
          ? 'hover:bg-amber-500/10 hover:text-amber-500'
          : 'text-emerald-500 hover:bg-emerald-500/10',
    });
  }

  if (
    isAdmin &&
    (member.role === 'member' || member.role === 'trainer') &&
    member.id !== currentUserId
  ) {
    actions.push({
      key: 'delete',
      label: member.role === 'trainer' ? 'Eliminar entrenador' : 'Eliminar',
      icon: Trash2,
      onClick: () => onDelete(member),
      className: 'hover:bg-red-500/10 hover:text-red-500',
      danger: true,
    });
  }

  return (
    <tr
      className={cn(
        'group cursor-pointer transition-colors',
        selected ? 'bg-brand/5 dark:bg-brand/10' : 'hover:bg-surface-raised'
      )}
      onClick={() => onSelect?.(member)}
      aria-selected={selected}
    >
      <td className="text-text px-4 py-2.5 font-semibold lg:px-5">{member.full_name}</td>
      {!isStaffMember && (
        <td className="px-4 py-2.5 lg:px-5">
          <span className={roleBadgeClass(member.role)}>
            {ROLE_LABELS[member.role as UserRole] ?? member.role}
          </span>
        </td>
      )}
      <td className="text-text-muted px-4 py-2.5 lg:px-5">{member.cedula || '-'}</td>
      <td className="px-4 py-2.5 lg:px-5">
        {member.role === 'member' ? (
          <div className="space-y-1">
            {member.membership_name ? (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                    {member.membership_name}
                  </p>
                  {member.subscription_status === 'paused' && (
                    <Badge variant="warning">Pausada</Badge>
                  )}
                  {badgeInfo && <Badge className={badgeInfo.className}>{badgeInfo.label}</Badge>}
                </div>
                <p className="text-text-muted text-[10px]">
                  {member.days_remaining ?? 0} días restantes
                </p>
              </div>
            ) : (
              <span className="text-text-muted text-xs">Sin plan</span>
            )}
            {member.training_shift ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAdmin || userRole === 'receptionist') onEditShift(member);
                }}
                className={cn(
                  'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold transition-opacity',
                  SHIFT_BADGE_CLASSES[member.training_shift],
                  (isAdmin || userRole === 'receptionist') && 'cursor-pointer hover:opacity-80'
                )}
                title={isAdmin || userRole === 'receptionist' ? 'Editar turno' : undefined}
              >
                {SHIFT_SHORT_LABELS[member.training_shift]}
              </button>
            ) : isAdmin || userRole === 'receptionist' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditShift(member);
                }}
                className="text-brand text-[10px] font-semibold hover:underline"
              >
                Asignar turno
              </button>
            ) : null}
            <OnboardingStatus onboarding={member.onboarding} variant="chip" />
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 lg:px-5">
        <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
          {member.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      </td>
      <td className="px-4 py-2.5 text-right lg:px-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.key === 'pause' && membershipOperationLoading}
              onClick={action.onClick}
              className={cn(
                'text-text-muted inline-flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-button)] p-1.5 transition-colors disabled:opacity-50',
                action.className
              )}
              title={action.label}
              aria-label={action.label}
            >
              <action.icon className="h-4 w-4 shrink-0" />
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
});
