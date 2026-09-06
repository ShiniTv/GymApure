import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge, Avatar } from '../../components/ui';
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

/** Hairline tappable row — detail + actions live in MemberQuickSheet. */
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
    <button
      type="button"
      onClick={() => onOpenDetail(member)}
      className="tap-feedback border-border/80 bg-surface hover:bg-surface-raised/80 flex min-h-[var(--touch-min)] w-full items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left transition-colors"
    >
      <Avatar name={member.full_name} size="sm" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-text min-w-0 truncate text-sm leading-tight font-medium tracking-[-0.011em]">
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
          {isStaffMember && <OnboardingStatus onboarding={member.onboarding} variant="chip" />}
        </div>
        <div className="text-text-muted text-small mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
          {metaParts.length > 0 ? (
            <span className="truncate">{metaParts.join(' · ')}</span>
          ) : (
            <span>Sin cédula</span>
          )}
          {!isStaffMember && (
            <span
              className={cn(
                'text-small inline-flex shrink-0 rounded px-1 py-0 font-semibold',
                roleBadgeClass(member.role)
              )}
            >
              {ROLE_LABELS[member.role as UserRole] ?? member.role}
            </span>
          )}
          {member.subscription_status === 'paused' && (
            <Badge variant="warning" className="text-small px-1.5 py-0">
              Pausada
            </Badge>
          )}
          {expiryBadge && (
            <Badge className={cn('text-small shrink-0 px-1.5 py-0', expiryBadge.className)}>
              {expiryBadge.label}
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight
        className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-60"
        aria-hidden
      />
    </button>
  );
});
