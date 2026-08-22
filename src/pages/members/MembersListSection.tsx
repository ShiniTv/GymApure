import { Search, Dumbbell, AlertTriangle } from 'lucide-react';
import { Button, PaginationBar, Card, EmptyState, TableRowSkeleton } from '../../components/ui';
import { cn, roleBadgeClass } from '../../lib/utils';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { MemberCardMobile } from './MemberCardMobile';
import { MemberDetailRail } from './MemberDetailPanel';
import { MemberTableRow } from './MemberTableRow';
import { StaggerContainer, StaggerItem } from '../../components/animations';
import type { Member } from '../../hooks/queries/useMembersQuery';
import type { MemberQuickAction } from './MemberQuickSheet';
import type { ReactNode } from 'react';
import type { UserRole } from '../../lib/roles';

export interface MembersListSectionProps {
  showDetailRail: boolean;
  detailMember: Member | null;
  onDetailMemberChange: (member: Member | null) => void;
  filteredMembers: Member[];
  loading: boolean;
  membersError: boolean;
  onRetry: () => void;
  colCount: number;
  isStaffMember: boolean;
  alertDays: number;
  userRole: UserRole | 'member';
  currentUserId: number | undefined;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  membersEmptyState: { title: string; description: string };
  membersEmptyAction: ReactNode;
  showTrainerAssignCta: boolean;
  membershipOperationId: number | null;
  onAssignSubscription: (member: Member) => void;
  onToggleStatus: (member: Member) => void;
  onDelete: (member: Member) => void;
  onShowBadge: (member: Member) => void;
  onEditShift: (member: Member) => void;
  onMembershipOperation: (member: Member) => void;
  getQuickActions: (member: Member) => MemberQuickAction[];
  coachingHubTab?: string;
}

export function MembersListSection({
  showDetailRail,
  detailMember,
  onDetailMemberChange,
  filteredMembers,
  loading,
  membersError,
  onRetry,
  colCount,
  isStaffMember,
  alertDays,
  userRole,
  currentUserId,
  page,
  pageSize,
  total,
  onPageChange,
  membersEmptyState,
  membersEmptyAction,
  showTrainerAssignCta,
  membershipOperationId,
  onAssignSubscription,
  onToggleStatus,
  onDelete,
  onShowBadge,
  onEditShift,
  onMembershipOperation,
  getQuickActions,
  coachingHubTab,
}: MembersListSectionProps) {
  if (membersError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar los miembros"
        description="Revisa tu conexión e inténtalo de nuevo."
        action={
          <Button size="sm" onClick={() => onRetry()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <div
      className={cn(
        showDetailRail &&
          detailMember &&
          'md:grid md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] md:items-start md:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]'
      )}
    >
      <div className="min-w-0">
        <ResponsiveTable
          items={filteredMembers}
          keyExtractor={(member) => member.id}
          breakpoint="lg"
          desktopInCard
          virtualizeMobileAt={13}
          loading={loading}
          loadingSkeleton={
            <>
              <div className="space-y-2 lg:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border-border space-y-1.5 rounded-lg border p-3">
                    <div className="bg-surface-overlay h-4 w-32 animate-pulse rounded" />
                    <div className="bg-surface-overlay h-3 w-24 animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <Card
                padding="none"
                rounded="xl"
                className="table-shell hidden overflow-hidden lg:block"
              >
                <div className="overflow-x-auto">
                  <table className="text-text-muted w-full text-left text-sm">
                    <tbody className="divide-border-subtle divide-y">
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                      <TableRowSkeleton cols={colCount} />
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          }
          emptyState={
            <EmptyState
              icon={showTrainerAssignCta ? Dumbbell : Search}
              title={membersEmptyState.title}
              description={membersEmptyState.description}
              action={membersEmptyAction}
            />
          }
          mobileClassName=""
          mobileWrapper={(children) => (
            <StaggerContainer
              className={cn(
                'grid grid-cols-1 gap-2.5',
                showDetailRail && detailMember ? 'md:grid-cols-1' : 'md:grid-cols-2'
              )}
            >
              {children}
            </StaggerContainer>
          )}
          mobile={(member) => (
            <StaggerItem>
              <MemberCardMobile
                member={member}
                isStaffMember={isStaffMember}
                alertDays={alertDays}
                roleBadgeClass={roleBadgeClass}
                onOpenDetail={onDetailMemberChange}
              />
            </StaggerItem>
          )}
          header={
            <tr>
              <th className="px-4 py-2.5 lg:px-5">Nombre</th>
              {!isStaffMember && <th className="px-4 py-2.5 lg:px-5">Rol</th>}
              <th className="px-4 py-2.5 lg:px-5">Identificación</th>
              <th className="px-4 py-2.5 lg:px-5">Membresía</th>
              <th className="px-4 py-2.5 lg:px-5">Estado</th>
              <th className="px-4 py-2.5 text-right lg:px-5">Acciones</th>
            </tr>
          }
          desktop={(member) => (
            <MemberTableRow
              member={member}
              userRole={userRole ?? 'member'}
              currentUserId={currentUserId}
              isStaffMember={isStaffMember}
              alertDays={alertDays}
              roleBadgeClass={roleBadgeClass}
              selected={detailMember?.id === member.id}
              onSelect={onDetailMemberChange}
              onAssignSubscription={onAssignSubscription}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
              onShowBadge={onShowBadge}
              onEditShift={onEditShift}
              onMembershipOperation={onMembershipOperation}
              membershipOperationLoading={membershipOperationId === member.id}
              coachingHubTab={coachingHubTab}
            />
          )}
        />
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          label="usuarios"
        />
      </div>
      {showDetailRail && detailMember ? (
        <MemberDetailRail
          member={detailMember}
          alertDays={alertDays}
          actions={getQuickActions(detailMember)}
          onClose={() => onDetailMemberChange(null)}
        />
      ) : null}
    </div>
  );
}
