import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, History, MessageSquare, CreditCard, Power, Trash2, IdCard, UtensilsCrossed } from 'lucide-react';
import { Badge } from '../../components/ui';
import { cn } from '../../lib/utils';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import { SHIFT_SHORT_LABELS, SHIFT_BADGE_CLASSES } from '../../lib/trainingShift';
import type { Member } from '../../hooks/queries/useMembersQuery';

interface MemberTableRowProps {
  member: Member;
  userRole: string;
  currentUserId: number | undefined;
  isStaffMember: boolean;
  alertDays: number;
  roleBadgeClass: (role: string) => string;
  onAssignSubscription: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
  onDelete: (member: Member) => void;
  onShowBadge: (member: Member) => void;
  onEditShift: (member: Member) => void;
}

export const MemberTableRow = memo(function MemberTableRow({
  member,
  userRole,
  currentUserId,
  isStaffMember,
  alertDays,
  roleBadgeClass,
  onAssignSubscription,
  onToggleStatus,
  onDelete,
  onShowBadge,
  onEditShift,
}: MemberTableRowProps) {
  const navigate = useNavigate();
  const isTrainer = userRole === 'trainer';
  const isAdmin = userRole === 'admin';
  const badgeInfo =
    member.role === 'member' && member.membership_name
      ? getExpiryBadgeInfo(member.days_remaining, alertDays)
      : null;

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
      <td className="px-4 lg:px-5 py-2.5 font-semibold text-zinc-800 dark:text-zinc-100">
        {member.full_name}
      </td>
      {!isStaffMember && (
        <td className="px-4 lg:px-5 py-2.5">
          <span className={roleBadgeClass(member.role)}>{member.role}</span>
        </td>
      )}
      <td className="px-4 lg:px-5 py-2.5 text-zinc-500 dark:text-zinc-400">{member.cedula || '-'}</td>
      <td className="px-4 lg:px-5 py-2.5">
        {member.role === 'member' ? (
          <div className="space-y-1">
            {member.membership_name ? (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                    {member.membership_name}
                  </p>
                  {badgeInfo && (
                    <Badge className={badgeInfo.className}>{badgeInfo.label}</Badge>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-300">
                  {member.days_remaining ?? 0} días restantes
                </p>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-300">Sin plan</span>
            )}
            {member.training_shift ? (
              <button
                type="button"
                onClick={() => (isAdmin || userRole === 'receptionist') && onEditShift(member)}
                className={cn(
                  'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold transition-opacity',
                  SHIFT_BADGE_CLASSES[member.training_shift],
                  (isAdmin || userRole === 'receptionist') && 'hover:opacity-80 cursor-pointer'
                )}
                title={(isAdmin || userRole === 'receptionist') ? 'Editar turno' : undefined}
              >
                {SHIFT_SHORT_LABELS[member.training_shift]}
              </button>
            ) : (isAdmin || userRole === 'receptionist') ? (
              <button
                type="button"
                onClick={() => { onEditShift(member); }}
                className="text-[10px] font-semibold text-brand hover:underline"
              >
                Asignar turno
              </button>
            ) : null}
          </div>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-300">—</span>
        )}
      </td>
      <td className="px-4 lg:px-5 py-2.5">
        <Badge variant={member.status === 'active' ? 'success' : 'danger'}>
          {member.status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      </td>
      <td className="px-4 lg:px-5 py-2.5 text-right">
        <div className="flex justify-end gap-1 opacity-100 transition-all">
          {isTrainer && member.role === 'member' && (
            <>
              <button
                onClick={() => navigate(`/members/${member.id}/routines`)}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                title="Ver Rutinas"
              >
                <Dumbbell className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(`/members/${member.id}/history`)}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Historial de Entrenamiento"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(`/messages?member=${member.id}`)}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                title="Enviar mensaje"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </>
          )}
          {(userRole === 'admin' || userRole === 'receptionist') && member.role === 'member' && (
            <>
              <button
                onClick={() => { onShowBadge(member); }}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                title="Ver carné"
              >
                <IdCard className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(`/messages?member=${member.id}`)}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                title="Enviar mensaje"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                onClick={() => { onAssignSubscription(member); }}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Asignar membresía"
              >
                <CreditCard className="h-4 w-4" />
              </button>
            </>
          )}
          {isAdmin && member.role === 'member' && (
            <>
              <button
                onClick={() => navigate(`/members/${member.id}/routines`)}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                title="Rutinas del miembro"
              >
                <Dumbbell className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(`/members/${member.id}/nutrition`)}
                className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Plan nutricional"
              >
                <UtensilsCrossed className="h-4 w-4" />
              </button>
              <button
                onClick={() => { onToggleStatus(member); }}
                className={`p-1.5 rounded-lg transition-colors ${member.status === 'active' ? 'text-zinc-400 dark:text-zinc-300 hover:text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                title={member.status === 'active' ? 'Desactivar' : 'Activar'}
              >
                <Power className="h-4 w-4" />
              </button>
              {member.role === 'member' && member.id !== currentUserId && (
                <button
                  onClick={() => { onDelete(member); }}
                  className="p-1.5 text-zinc-400 dark:text-zinc-300 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Eliminar miembro"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
});
