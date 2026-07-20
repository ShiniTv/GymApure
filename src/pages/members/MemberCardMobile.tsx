import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge, Avatar, DataCard } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, type UserRole } from '../../lib/roles';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import type { Member } from '../../hooks/queries/useMembersQuery';
import { OnboardingStatus } from '../../components/members/OnboardingStatus';

interface MemberCardMobileProps {
  member: Member;
  isStaffMember: boolean;
  alertDays: number;
  roleBadgeClass: (role: string) => string;
  onOpenDetail: (member: Member) => void;
}

/** Compact tappable row — detail + actions live in MemberQuickSheet. */
export const MemberCardMobile = memo(function MemberCardMobile({
  member,
  isStaffMember,
  alertDays,
  roleBadgeClass,
  onOpenDetail,
}: MemberCardMobileProps) {
  const expiryBadge =
    member.role === 'member' && member.membership_name
      ? getExpiryBadgeInfo(member.days_remaining, alertDays)
      : null;

  const metaParts: string[] = [];
  if (member.cedula) metaParts.push(member.cedula);
  if (member.membership_name) {
    metaParts.push(`${member.membership_name} · ${member.days_remaining ?? 0}d`);
  }

  return (
    <DataCard
      className="!space-y-0 active:bg-zinc-50 dark:active:bg-zinc-800/60"
      onClick={() => onOpenDetail(member)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={member.full_name} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
              {member.full_name}
            </p>
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                member.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
              )}
              title={member.status === 'active' ? 'Activo' : 'Inactivo'}
              aria-label={member.status === 'active' ? 'Activo' : 'Inactivo'}
            />
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
            {metaParts.length > 0 ? (
              <span className="truncate">{metaParts.join(' · ')}</span>
            ) : (
              <span>Sin cédula</span>
            )}
            {!isStaffMember && (
              <span
                className={cn(
                  'inline-flex shrink-0 rounded px-1 py-0 text-[10px] font-semibold',
                  roleBadgeClass(member.role)
                )}
              >
                {ROLE_LABELS[member.role as UserRole] ?? member.role}
              </span>
            )}
            {member.subscription_status === 'paused' && (
              <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                Pausada
              </Badge>
            )}
            {expiryBadge && (
              <Badge className={cn('shrink-0 px-1.5 py-0 text-[10px]', expiryBadge.className)}>
                {expiryBadge.label}
              </Badge>
            )}
          </div>
          <div className="mt-1">
            <OnboardingStatus onboarding={member.onboarding} compact />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" aria-hidden />
      </div>
    </DataCard>
  );
});
