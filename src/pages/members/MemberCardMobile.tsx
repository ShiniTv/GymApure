import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  History,
  MessageSquare,
  CreditCard,
  Power,
  Trash2,
  IdCard,
  UtensilsCrossed,
  Clock,
} from 'lucide-react';
import { Badge, Avatar, DataCard } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, type UserRole } from '../../lib/roles';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import { SHIFT_SHORT_LABELS, SHIFT_BADGE_CLASSES } from '../../lib/trainingShift';
import type { Member } from '../../hooks/queries/useMembersQuery';

interface MemberCardMobileProps {
  member: Member;
  userRole: string;
  currentUserId: number | undefined;
  isStaffMember: boolean;
  alertDays: number;
  roleBadgeClass: (role: string) => string;
  mobileIconBtnClass: string;
  onAssignSubscription: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
  onDelete: (member: Member) => void;
  onShowBadge: (member: Member) => void;
  onEditShift: (member: Member) => void;
}

export const MemberCardMobile = memo(function MemberCardMobile({
  member,
  userRole,
  currentUserId,
  isStaffMember,
  alertDays,
  roleBadgeClass,
  mobileIconBtnClass,
  onAssignSubscription,
  onToggleStatus,
  onDelete,
  onShowBadge,
  onEditShift,
}: MemberCardMobileProps) {
  const navigate = useNavigate();
  const isTrainer = userRole === 'trainer';
  const isAdmin = userRole === 'admin';
  const canEditShift = member.role === 'member' && (isAdmin || userRole === 'receptionist');
  const expiryBadge =
    member.role === 'member' && member.membership_name
      ? getExpiryBadgeInfo(member.days_remaining, alertDays)
      : null;
  const showMobileActions =
    (isTrainer && member.role === 'member') ||
    ((userRole === 'admin' || userRole === 'receptionist') && member.role === 'member') ||
    isAdmin;

  return (
    <DataCard className="!p-3">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={member.full_name} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
              {member.full_name}
            </p>
            <Badge variant={member.status === 'active' ? 'success' : 'danger'} className="shrink-0">
              {member.status === 'active' ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="truncate">{member.cedula || 'Sin cédula'}</span>
            {!isStaffMember && (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
                <span
                  className={cn(
                    'inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    roleBadgeClass(member.role)
                  )}
                >
                  {ROLE_LABELS[member.role as UserRole] ?? member.role}
                </span>
              </>
            )}
          </div>
          {member.membership_name && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[11px] font-medium text-emerald-600 dark:text-emerald-500">
                {member.membership_name} · {member.days_remaining ?? 0}d
              </p>
              {expiryBadge && (
                <Badge className={cn('shrink-0 text-[10px]', expiryBadge.className)}>
                  {expiryBadge.label}
                </Badge>
              )}
            </div>
          )}
          {canEditShift &&
            (member.training_shift ? (
              <button
                type="button"
                onClick={() => onEditShift(member)}
                className={cn(
                  'mt-1.5 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold transition-opacity hover:opacity-80',
                  SHIFT_BADGE_CLASSES[member.training_shift]
                )}
              >
                {SHIFT_SHORT_LABELS[member.training_shift]}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onEditShift(member)}
                className="text-brand mt-1.5 text-[11px] font-semibold hover:underline"
              >
                Asignar turno
              </button>
            ))}
        </div>
      </div>

      {showMobileActions && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          {isTrainer && member.role === 'member' && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/members/${member.id}/routines`)}
                className={mobileIconBtnClass}
                aria-label="Asignar rutina"
              >
                <Dumbbell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/members/${member.id}/history`)}
                className={mobileIconBtnClass}
                aria-label="Historial"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/members/${member.id}/nutrition`)}
                className={mobileIconBtnClass}
                aria-label="Nutrición"
              >
                <UtensilsCrossed className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/messages?member=${member.id}`)}
                className={mobileIconBtnClass}
                aria-label="Enviar mensaje"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </>
          )}
          {(userRole === 'admin' || userRole === 'receptionist') && member.role === 'member' && (
            <>
              <button
                type="button"
                onClick={() => {
                  onShowBadge(member);
                }}
                className={mobileIconBtnClass}
                aria-label="Ver carné"
              >
                <IdCard className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onEditShift(member)}
                className={mobileIconBtnClass}
                aria-label={member.training_shift ? 'Editar turno' : 'Asignar turno'}
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/messages?member=${member.id}`)}
                className={mobileIconBtnClass}
                aria-label="Enviar mensaje"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onAssignSubscription(member);
                }}
                className={mobileIconBtnClass}
                aria-label="Asignar membresía"
              >
                <CreditCard className="h-4 w-4" />
              </button>
            </>
          )}
          {isAdmin && member.role === 'member' && (
            <>
              <button
                type="button"
                onClick={() => {
                  onToggleStatus(member);
                }}
                className={cn(mobileIconBtnClass, member.status !== 'active' && 'text-emerald-500')}
                aria-label={member.status === 'active' ? 'Desactivar' : 'Activar'}
              >
                <Power className="h-4 w-4" />
              </button>
              {member.role === 'member' && member.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(member);
                  }}
                  className={cn(mobileIconBtnClass, 'hover:bg-red-500/10 hover:text-red-500')}
                  aria-label="Eliminar miembro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </DataCard>
  );
});
