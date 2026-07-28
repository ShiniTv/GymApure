import { PullToRefreshContainer } from '../components/PullToRefresh';
import { PaymentRegisterModal } from './payments/PaymentRegisterModal';
import { PaymentActionModals } from './payments/PaymentActionModals';
import { PaymentsToolbar } from './payments/PaymentsToolbar';
import { PaymentsListSection } from './payments/PaymentsListSection';
import { usePaymentsPage } from './payments/usePaymentsPage';

export default function Payments() {
  const page = usePaymentsPage();

  return (
    <PullToRefreshContainer pullDistance={page.pullPayments} isRefreshing={page.refreshingPayments}>
      <div className="page-stack-tight mx-auto w-full max-w-7xl" {...page.paymentsHandlers}>
        <PaymentsToolbar
          isMember={page.isMember}
          isStaffPayment={page.isStaffPayment}
          adminStats={page.adminStats}
          total={page.total}
          loading={page.loading}
          paymentsCount={page.payments.length}
          statusFilter={page.statusFilter}
          stalePending={page.stalePending}
          searchInput={page.searchInput}
          onSearchInputChange={page.setSearchInput}
          onStatusFilterChange={page.handleStatusFilterChange}
          onClearStatusFilter={page.clearStatusFilter}
          onOpenRegister={() => page.openRegisterModal()}
        />

        <PaymentsListSection
          isMember={page.isMember}
          isStaffPayment={page.isStaffPayment}
          showDetailRail={page.showDetailRail}
          loading={page.loading}
          paymentsError={page.paymentsError}
          onRetry={() => void page.refetchPayments()}
          payments={page.payments}
          displayPayments={page.displayPayments}
          search={page.search}
          statusFilter={page.statusFilter}
          stalePending={page.stalePending}
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={page.setPage}
          onClearStatusFilter={page.clearStatusFilter}
          onOpenRegister={() => page.openRegisterModal()}
          selectedPayment={page.selectedPayment}
          onSelectedPaymentChange={page.setSelectedPayment}
          onProofPreview={page.setProofPreview}
          onApprove={page.openApproveModal}
          onReject={page.openRejectModal}
        />

        <PaymentRegisterModal
          open={page.showModal}
          onClose={page.closeRegisterModal}
          isStaffPayment={page.isStaffPayment}
          isMember={page.isMember}
          onSubmit={page.handleSubmit}
          submitError={page.submitError}
          fieldErrors={page.fieldErrors}
          onClearFieldError={(key) => page.setFieldErrors((prev) => ({ ...prev, [key]: '' }))}
          loadingMembers={page.loadingMembers}
          memberOptions={page.memberOptions}
          selectedMemberId={page.selectedMemberId}
          onSelectedMemberIdChange={page.setSelectedMemberId}
          membershipPlans={page.membershipPlans}
          selectedPlanId={page.selectedPlanId}
          onPlanSelect={page.handlePlanSelect}
          amountUsd={page.amountUsd}
          onAmountUsdChange={page.setAmountUsd}
          method={page.method}
          onMethodChange={page.setMethod}
          needsBsRate={page.needsBsRate}
          exchangeRate={page.exchangeRate}
          exchangeRateLoading={page.exchangeRateLoading}
          exchangeRateError={!!page.exchangeRateError}
          amountBs={page.amountBs}
          onRefetchExchangeRate={() => void page.refetchExchangeRate()}
          reference={page.reference}
          onReferenceChange={page.setReference}
          file={page.file}
          onFileChange={page.setFile}
          submitting={page.submitting}
        />

        <PaymentActionModals
          isStaffPayment={page.isStaffPayment}
          approveTarget={page.approveTarget}
          onCloseApprove={() => page.setApproveTarget(null)}
          membershipPlans={page.membershipPlans}
          selectedPlanId={page.selectedPlanId}
          onSelectedPlanIdChange={page.setSelectedPlanId}
          approving={page.approving}
          onApprove={page.handleApprove}
          rejectTarget={page.rejectTarget}
          onCloseReject={() => {
            page.setRejectTarget(null);
            page.setRejectReason('');
            page.setActionError('');
          }}
          rejectReason={page.rejectReason}
          onRejectReasonChange={page.setRejectReason}
          actionError={page.actionError}
          rejecting={page.rejecting}
          onReject={page.handleReject}
          proofPreview={page.proofPreview}
          onCloseProof={() => page.setProofPreview(null)}
        />
      </div>
    </PullToRefreshContainer>
  );
}
