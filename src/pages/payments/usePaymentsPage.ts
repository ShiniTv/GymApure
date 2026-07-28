import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAdminStatsOptional } from '../../context/AdminStatsContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useToastOptional } from '../../context/ToastContext';
import {
  usePaymentsQuery,
  useInvalidatePayments,
  useReviewPaymentMutation,
} from '../../hooks/queries/usePaymentsQuery';
import { useMembershipPlansQuery } from '../../hooks/queries/useMembershipsQuery';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { type Payment } from './helpers';
import { useExchangeRateQuery } from '../../hooks/queries/useExchangeRateQuery';
import type { PaymentMemberOption as MemberOption } from './PaymentRegisterModal';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export function usePaymentsPage() {
  const { user } = useAuth();
  usePageTitle('Pagos');
  const { isDesktop, isTablet } = useBreakpoint();
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const isMember = user?.role === 'member';
  const isStaffPayment = user?.role === 'admin' || user?.role === 'receptionist';
  const showDetailRail = isDesktop || isTablet;
  const invalidatePayments = useInvalidatePayments();

  const onRefreshPayments = useCallback(async () => {
    invalidatePayments();
    await adminStats?.refresh();
    await memberStats?.refresh();
  }, [invalidatePayments, adminStats, memberStats]);
  const {
    pullDistance: pullPayments,
    isRefreshing: refreshingPayments,
    handlers: paymentsHandlers,
  } = usePullToRefresh({
    onRefresh: onRefreshPayments,
    threshold: 80,
  });

  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(() =>
    user?.role === 'admin' || user?.role === 'receptionist' ? 'pending' : ''
  );
  const [stalePending, setStalePending] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const pageSize = user?.role === 'member' ? 10 : 20;
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (!isStaffPayment) return;
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, isStaffPayment]);

  const paymentsQueryParams = {
    page,
    pageSize,
    statusFilter,
    search: isStaffPayment ? search : undefined,
  };
  const {
    data: paymentsData,
    isPending: loading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePaymentsQuery(paymentsQueryParams);
  const reviewPayment = useReviewPaymentMutation(paymentsQueryParams);
  const payments = paymentsData?.items ?? [];
  const total = paymentsData?.total ?? 0;
  const displayPayments = useMemo(() => {
    if (!stalePending) return payments;
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return payments.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return Number.isFinite(t) && t < cutoff;
    });
  }, [payments, stalePending]);

  // Form state
  const [amountUsd, setAmountUsd] = useState('');
  const [amountBs, setAmountBs] = useState('');
  const [method, setMethod] = useState('pago_movil');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [approveTarget, setApproveTarget] = useState<Payment | null>(null);
  const { data: membershipPlans = [] } = useMembershipPlansQuery(isMember || isStaffPayment);
  const needsBsRate = method === 'pago_movil' || method === 'transferencia';
  const {
    data: exchangeRate,
    isPending: exchangeRateLoading,
    isError: exchangeRateError,
    refetch: refetchExchangeRate,
  } = useExchangeRateQuery(showModal && needsBsRate);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proofPreview, setProofPreview] = useState<Payment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionError, setActionError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [searchParams] = useSearchParams();
  const toast = useToastOptional();

  useEffect(() => {
    if (!selectedPayment) return;
    if (!payments.some((p) => p.id === selectedPayment.id)) {
      setSelectedPayment(null);
    }
  }, [payments, selectedPayment]);

  const openRegisterModal = useCallback((memberId?: string) => {
    setSubmitError('');
    setFieldErrors({});
    setSelectedMemberId(memberId ?? '');
    setShowModal(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setShowModal(false);
    setSubmitError('');
    setFieldErrors({});
    setSelectedMemberId('');
    setAmountUsd('');
    setReference('');
    setFile(null);
    setSelectedPlanId('');
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      setStatusFilter(status);
      setPage(1);
    } else if (
      !status &&
      (user?.role === 'admin' || user?.role === 'receptionist') &&
      !searchParams.get('register')
    ) {
      setStatusFilter('pending');
    }
  }, [searchParams, user?.role]);

  const openApproveModal = (payment: Payment) => {
    setApproveTarget(payment);
    const matching = membershipPlans.find(
      (p) => Math.abs(Number(p.price_usd) - Number(payment.amount_usd)) < 0.01
    );
    setSelectedPlanId(matching ? String(matching.id) : '');
  };

  const openRejectModal = (payment: Payment) => {
    setRejectReason('');
    setActionError('');
    setRejectTarget(payment);
  };

  useEffect(() => {
    if (!isStaffPayment) return;
    const paymentIdRaw = searchParams.get('paymentId');
    if (!paymentIdRaw) return;
    const paymentId = parseInt(paymentIdRaw, 10);
    if (Number.isNaN(paymentId) || payments.length === 0) return;
    const target = payments.find((p) => p.id === paymentId && p.status === 'pending');
    if (target) {
      openApproveModal(target);
    }
    // openApproveModal intentionally omitted (same as pre-split Payments.tsx)
  }, [searchParams, payments, isStaffPayment]);

  useEffect(() => {
    if (searchParams.get('register') === '1') {
      if (isStaffPayment || isMember) {
        openRegisterModal(searchParams.get('memberId') ?? undefined);
      }
    }
  }, [searchParams, isStaffPayment, isMember, openRegisterModal]);

  useEffect(() => {
    if (!showModal || !isStaffPayment) return;
    setLoadingMembers(true);
    void apiFetch('/api/users/options?role=member')
      .then((res) => parseJsonResponse<MemberOption[]>(res))
      .then((data) => {
        setMemberOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setMemberOptions([]);
      })
      .finally(() => {
        setLoadingMembers(false);
      });
  }, [showModal, isStaffPayment]);

  const apiFetchPayments = () => invalidatePayments();

  useEffect(() => {
    const usd = parseFloat(amountUsd);
    if (!needsBsRate) {
      setAmountBs('');
      return;
    }
    if (!exchangeRate) {
      setAmountBs('');
      return;
    }
    if (!Number.isNaN(usd) && usd > 0) {
      setAmountBs((usd * exchangeRate.rate).toFixed(2));
    } else {
      setAmountBs('');
    }
  }, [amountUsd, exchangeRate, needsBsRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const nextErrors: Record<string, string> = {};
    if (isStaffPayment && !selectedMemberId) {
      nextErrors.member = 'Seleccione un miembro';
    }
    if (!amountUsd || Number.isNaN(parseFloat(amountUsd)) || parseFloat(amountUsd) <= 0) {
      nextErrors.amount = 'Ingresa un monto válido en USD';
    }
    if (!reference.trim()) {
      nextErrors.reference = 'La referencia es obligatoria';
    }
    if (needsBsRate && !exchangeRate) {
      nextErrors.exchange =
        'La tasa de cambio no está disponible. Intenta de nuevo en unos minutos.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError(Object.values(nextErrors)[0] || 'Revisa el formulario');
      return;
    }
    const formData = new FormData();
    formData.append('user_id', isMember ? user.id.toString() : selectedMemberId);
    formData.append('amount_usd', amountUsd);
    if (needsBsRate && amountBs) formData.append('amount_bs', amountBs);
    formData.append('method', method);
    formData.append('reference', reference);
    if (needsBsRate && exchangeRate) {
      formData.append('exchange_rate', String(exchangeRate.rate));
    }
    if (file) formData.append('proof', file);

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        body: formData,
      });
      await parseJsonResponse(res);

      closeRegisterModal();
      void apiFetchPayments();
      await adminStats?.refresh();
      await memberStats?.refresh();
      toast?.success(
        isStaffPayment ? 'Pago registrado correctamente' : 'Pago reportado correctamente'
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo enviar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget || approving) return;
    if (!selectedPlanId) {
      toast?.error('Selecciona un plan de membresía');
      return;
    }

    setApproving(true);
    try {
      await reviewPayment.mutateAsync({
        paymentId: approveTarget.id,
        status: 'approved',
        membershipId: Number(selectedPlanId),
      });

      setApproveTarget(null);
      setSelectedPlanId('');
      await adminStats?.refresh();
      toast?.success('Pago aprobado');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'No se pudo aprobar');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || rejecting) return;
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      setActionError('Indica un motivo de al menos 3 caracteres');
      return;
    }

    setRejecting(true);
    try {
      await reviewPayment.mutateAsync({
        paymentId: rejectTarget.id,
        status: 'rejected',
        reason,
      });
      setRejectTarget(null);
      setRejectReason('');
      await adminStats?.refresh();
      toast?.success('Pago rechazado');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo rechazar');
    } finally {
      setRejecting(false);
    }
  };

  const handleStatusFilterChange = (v: string) => {
    if (v === 'pending_old') {
      setStatusFilter('pending');
      setStalePending(true);
    } else {
      setStatusFilter(v);
      setStalePending(false);
    }
    setPage(1);
  };

  const clearStatusFilter = () => {
    setStatusFilter('');
    setPage(1);
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = membershipPlans.find((p) => String(p.id) === planId);
    if (plan) setAmountUsd(String(plan.price_usd));
  };

  return {
    user,
    isMember,
    isStaffPayment,
    showDetailRail,
    adminStats,
    pullPayments,
    refreshingPayments,
    paymentsHandlers,
    showModal,
    page,
    setPage,
    statusFilter,
    setStatusFilter,
    stalePending,
    searchInput,
    setSearchInput,
    search,
    pageSize,
    memberOptions,
    selectedMemberId,
    setSelectedMemberId,
    loadingMembers,
    loading,
    paymentsError,
    refetchPayments,
    payments,
    total,
    displayPayments,
    amountUsd,
    setAmountUsd,
    amountBs,
    method,
    setMethod,
    reference,
    setReference,
    file,
    setFile,
    approveTarget,
    setApproveTarget,
    membershipPlans,
    needsBsRate,
    exchangeRate,
    exchangeRateLoading,
    exchangeRateError,
    refetchExchangeRate,
    selectedPlanId,
    setSelectedPlanId,
    rejectTarget,
    setRejectTarget,
    rejectReason,
    setRejectReason,
    proofPreview,
    setProofPreview,
    selectedPayment,
    setSelectedPayment,
    actionError,
    setActionError,
    submitError,
    fieldErrors,
    setFieldErrors,
    submitting,
    approving,
    rejecting,
    openRegisterModal,
    closeRegisterModal,
    openApproveModal,
    openRejectModal,
    handleSubmit,
    handleApprove,
    handleReject,
    handleStatusFilterChange,
    clearStatusFilter,
    handlePlanSelect,
  };
}
