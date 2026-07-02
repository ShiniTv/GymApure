import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, History, MessageSquare, CreditCard, Power, Trash2 } from 'lucide-react';
import { Badge, Avatar, DataCard } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, type UserRole } from '../../lib/roles';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
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
}: MemberCardMobileProps) {
  const navigate = useNavigate();
  const isTrainer = userRole === 'trainer';
  const isAdmin = userRole === 'admin';
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
      <div className="flex items-start gap-3 min-w-0">
        <Avatar name={member.full_name} size="sm" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate leading-tight">
              {member.full_name}
            </p>
            <Badge
              variant={member.status === 'active' ? 'success' : 'danger'}
              className="shrink-0"
            >
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
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 truncate">
                {member.membership_name} · {member.days_remaining ?? 0}d
              </p>
              {expiryBadge && (
                <Badge className={cn('shrink-0 text-[10px]', expiryBadge.className)}>
                  {expiryBadge.label}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {showMobileActions && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1">
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
                onClick={() => navigate(`/messages?member=${member.id}`)}
                className={mobileIconBtnClass}
                aria-label="Enviar mensaje"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onAssignSubscription(member)}
                className={mobileIconBtnClass}
                aria-label="Asignar membresía"
              >
                <CreditCard className="h-4 w-4" />
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => onToggleStatus(member)}
                className={cn(
                  mobileIconBtnClass,
                  member.status !== 'active' && 'text-emerald-500'
                )}
                aria-label={member.status === 'active' ? 'Desactivar' : 'Activar'}
              >
                <Power className="h-4 w-4" />
              </button>
              {member.role === 'member' && member.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => onDelete(member)}
                  className={cn(mobileIconBtnClass, 'hover:text-red-500 hover:bg-red-500/10')}
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
