import { lazy, Suspense } from 'react';
import { MemberAddModal } from './members/MemberAddModal';
import { MemberAssignModal } from './members/MemberAssignModal';
import { MemberActionModals } from './members/MemberActionModals';
import { MemberQuickSheet } from './members/MemberQuickSheet';
import { MembersToolbar } from './members/MembersToolbar';
import { MembersListSection } from './members/MembersListSection';
import { useMembersPage } from './members/useMembersPage';
import { PullToRefreshContainer } from '../components/PullToRefresh';

const MemberBadgeModal = lazy(() =>
  import('../components/member/MemberBadgeModal').then((m) => ({ default: m.MemberBadgeModal }))
);

export default function Members() {
  const page = useMembersPage();

  return (
    <PullToRefreshContainer pullDistance={page.pullMembers} isRefreshing={page.refreshingMembers}>
      <div
        className="page-stack-tight stagger-fade-in mx-auto w-full max-w-7xl"
        {...page.membersHandlers}
      >
        <MembersToolbar
          isTrainer={page.isTrainer}
          isReceptionist={page.isReceptionist}
          userRole={page.user?.role}
          adminStats={page.adminStats}
          alertDays={page.alertDays}
          total={page.total}
          searchInput={page.searchInput}
          onSearchInputChange={page.setSearchInput}
          canAddUser={page.canAddUser}
          addUserLabel={page.addUserLabel}
          onAdd={() => page.setIsAdding(true)}
          roleFilter={page.roleFilter}
          onRoleFilterChange={page.setRoleFilter}
          shiftFilter={page.shiftFilter}
          onShiftFilterChange={page.handleShiftFilterChange}
          expiringFilter={page.expiringFilter}
          onExpiringFilterChange={page.setExpiringFilter}
          needsFilter={page.needsFilter}
          onTrainerRosterFilterChange={page.handleTrainerRosterFilter}
          onPageChange={page.setPage}
          membersWithoutPlanCount={page.membersWithoutPlan.length}
          loading={page.loading}
          noPlanAlertDismissed={page.noPlanAlertDismissed}
          onDismissNoPlanAlert={page.dismissNoPlanAlert}
        />

        <MemberAddModal
          open={page.isAdding}
          onClose={() => page.setIsAdding(false)}
          isTrainer={page.isTrainer}
          isReceptionist={page.isReceptionist}
          isStaffMember={page.isStaffMember}
          canCreateAdmin={page.user?.role === 'admin'}
          newMember={page.newMember}
          onNewMemberChange={page.setNewMember}
          errors={page.errors}
          onErrorsChange={page.setErrors}
          onSubmit={page.handleAddMember}
        />

        <MembersListSection
          showDetailRail={page.showDetailRail}
          detailMember={page.detailMember}
          onDetailMemberChange={(member) => {
            if (!member) {
              page.setDetailMember(null);
              return;
            }
            page.openMemberDetail(member);
          }}
          filteredMembers={page.filteredMembers}
          loading={page.loading}
          membersError={page.membersError}
          onRetry={() => void page.refetchMembers()}
          colCount={page.colCount}
          isStaffMember={page.isStaffMember}
          alertDays={page.alertDays}
          userRole={page.user?.role ?? 'member'}
          currentUserId={page.user?.id}
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={page.setPage}
          membersEmptyState={page.membersEmptyState}
          membersEmptyAction={page.membersEmptyAction}
          showTrainerAssignCta={page.showTrainerAssignCta}
          membershipOperationId={page.membershipOperationId}
          onAssignSubscription={(member) => void page.openAssignSubscription(member)}
          onToggleStatus={page.handleToggleClick}
          onDelete={page.handleDeleteClick}
          onShowBadge={page.openMemberBadge}
          onEditShift={page.openEditShift}
          onMembershipOperation={(member) => void page.handleMembershipOperation(member)}
          getQuickActions={page.buildQuickActions}
          coachingHubTab={page.coachingHubTab}
        />

        <MemberAssignModal
          target={page.assignTarget}
          onClose={() => page.setAssignTarget(null)}
          isReceptionist={page.isReceptionist}
          membershipPlans={page.membershipPlans}
          selectedPlanId={page.selectedPlanId}
          onSelectedPlanIdChange={page.setSelectedPlanId}
          approvedPayments={page.approvedPayments}
          selectedPaymentId={page.selectedPaymentId}
          onSelectedPaymentIdChange={page.setSelectedPaymentId}
          assignError={page.assignError}
          onClearAssignError={() => page.setAssignError('')}
          onAssign={page.handleAssignSubscription}
        />

        <MemberActionModals
          toggleTarget={page.toggleTarget}
          toggling={page.toggling}
          onCloseToggle={() => page.setToggleTarget(null)}
          onConfirmToggle={page.confirmToggleStatus}
          deleteTarget={page.deleteTarget}
          deleteConfirmName={page.deleteConfirmName}
          onDeleteConfirmNameChange={page.setDeleteConfirmName}
          deleteError={page.deleteError}
          onClearDeleteError={() => page.setDeleteError('')}
          deleting={page.deleting}
          onCloseDelete={page.closeDeleteModal}
          onConfirmDelete={page.confirmDeleteUser}
          pauseTarget={page.pauseTarget}
          pauseReason={page.pauseReason}
          onPauseReasonChange={page.setPauseReason}
          pauseError={page.pauseError}
          pausing={page.pausing}
          onClosePause={() => {
            page.setPauseTarget(null);
            page.setPauseReason('');
            page.setPauseError('');
          }}
          onConfirmPause={() => void page.confirmPauseMembership()}
          editShiftTarget={page.editShiftTarget}
          editShiftValue={page.editShiftValue}
          onEditShiftValueChange={page.setEditShiftValue}
          savingShift={page.savingShift}
          onCloseEditShift={() => page.setEditShiftTarget(null)}
          onSaveShift={page.saveMemberShift}
        />

        <Suspense fallback={null}>
          <MemberBadgeModal
            open={!!page.badgeTarget}
            onClose={() => {
              page.setBadgeTarget(null);
            }}
            member={page.badgeTarget}
          />
        </Suspense>
        <MemberQuickSheet
          member={page.detailMember}
          open={!!page.detailMember && !page.showDetailRail}
          onClose={() => page.setDetailMember(null)}
          alertDays={page.alertDays}
          actions={page.detailMember ? page.buildQuickActions(page.detailMember) : []}
        />
      </div>
    </PullToRefreshContainer>
  );
}
