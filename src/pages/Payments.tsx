import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Plus, Check, X, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/utils';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Button,
  Card,
  PageHeader,
  PaginationBar,
  Badge,
  FilterChips,
  BackToDashboardLink,
  EmptyState,
  SearchInput,
  ListRowSkeleton,
  TableRowSkeleton,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { usePaymentsQuery, useInvalidatePayments } from '../hooks/queries/usePaymentsQuery';
import { useMembershipPlansQuery } from '../hooks/queries/useMembershipsQuery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import {
  formatPaymentDate,
  formatPaymentMethod,
  paymentStatusLabel,
  paymentStatusVariant,
  type Payment,
} from './payments/helpers';
import { useExchangeRateQuery } from '../hooks/queries/useExchangeRateQuery';
import { ProofPreviewButton } from './payments/ProofPreviewButton';
import { PaymentMobileCard } from './payments/PaymentMobileCard';
import { PaymentRegisterModal } from './payments/PaymentRegisterModal';
import { PaymentActionModals } from './payments/PaymentActionModals';
import type { PaymentMemberOption as MemberOption } from './payments/PaymentRegisterModal';
import { cn } from '../lib/utils';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function Payments() {
  const { user } = useAuth();
  usePageTitle('Pagos');
  const { isMobileShell } = useBreakpoint();
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const isMember = user?.role === 'member';
  const isStaffPayment = user?.role === 'admin' || user?.role === 'receptionist';
  const showStaffMobileChrome = isStaffPayment && isMobileShell;
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

  const {
    data: paymentsData,
    isPending: loading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePaymentsQuery({
    page,
    pageSize,
    statusFilter,
    search: isStaffPayment ? search : undefined,
  });
  const payments = paymentsData?.items ?? [];
  const total = paymentsData?.total ?? 0;

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
  const [actionError, setActionError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [searchParams] = useSearchParams();
  const toast = useToastOptional();

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

  const openApproveModal = (payment: Payment) => {
    setApproveTarget(payment);
    const matching = membershipPlans.find(
      (p) => Math.abs(Number(p.price_usd) - Number(payment.amount_usd)) < 0.01
    );
    setSelectedPlanId(matching ? String(matching.id) : '');
  };

  const handleApprove = async () => {
    if (!approveTarget || approving) return;
    if (!selectedPlanId) {
      toast?.error('Selecciona un plan de membresía');
      return;
    }

    setApproving(true);
    try {
      const res = await apiFetch(`/api/payments/${approveTarget.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_id: Number(selectedPlanId) }),
      });
      await parseJsonResponse(res);

      setApproveTarget(null);
      setSelectedPlanId('');
      apiFetchPayments();
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
      const res = await apiFetch(`/api/payments/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      await parseJsonResponse(res);
      setRejectTarget(null);
      setRejectReason('');
      apiFetchPayments();
      await adminStats?.refresh();
      toast?.success('Pago rechazado');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo rechazar');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <PullToRefreshContainer pullDistance={pullPayments} isRefreshing={refreshingPayments}>
      <div className="page-stack-tight mx-auto w-full max-w-7xl" {...paymentsHandlers}>
        {!showStaffMobileChrome && (
          <PageHeader
            compact
            title={
              isMember ? (
                <>
                  Mis <span className="text-brand">pagos</span>
                </>
              ) : (
                <>
                  <span className="text-brand">Pagos</span>
                </>
              )
            }
            subtitle={isMember ? 'Activa tu membresía' : undefined}
            action={
              isMember ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <BackToDashboardLink />
                  <Button
                    size="sm"
                    className="h-10 min-h-10 shrink-0 rounded-xl px-3 whitespace-nowrap sm:px-4"
                    onClick={() => openRegisterModal()}
                    aria-label="Reportar pago"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Reportar pago</span>
                  </Button>
                </div>
              ) : isStaffPayment ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <BackToDashboardLink />
                  <Button
                    size="sm"
                    className="h-10 min-h-10 shrink-0 rounded-xl px-3"
                    onClick={() => openRegisterModal()}
                    aria-label="Registrar pago"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Registrar</span>
                  </Button>
                </div>
              ) : (
                <BackToDashboardLink />
              )
            }
          />
        )}

        {isStaffPayment && adminStats?.stats && (
          <div className="hidden grid-cols-4 gap-2 lg:grid">
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Pendientes
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {adminStats.stats.pendingPayments}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                &gt;2 días
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {adminStats.stats.pendingPaymentsOlderThan2Days ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Ingresos mes
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {formatMoney(adminStats.stats.revenueThisMonth ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                En lista
              </p>
              <p className="mt-0.5 text-xl font-bold text-zinc-900 tabular-nums dark:text-white">
                {total}
              </p>
            </div>
          </div>
        )}

        {isMember && !loading && (payments.length > 0 || Boolean(statusFilter)) && (
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="min-w-0 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {total} pago{total !== 1 ? 's' : ''}
              {statusFilter ? ` · ${paymentStatusLabel(statusFilter as Payment['status'])}` : ''}
            </p>
            {statusFilter ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setPage(1);
                }}
                className="text-brand shrink-0 text-[11px] font-semibold hover:underline"
              >
                Ver todos
              </button>
            ) : null}
          </div>
        )}

        {isMember && (loading || payments.length > 0 || Boolean(statusFilter)) && (
          <FilterChips
            options={[
              { value: '', label: 'Todos' },
              { value: 'pending', label: 'Pendientes' },
              { value: 'approved', label: 'Aprobados' },
              { value: 'rejected', label: 'Rechazados' },
            ]}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          />
        )}

        {isStaffPayment && (
          <>
            <div className="flex items-center gap-2">
              <SearchInput
                containerClassName="min-w-0 flex-1"
                placeholder="Buscar por nombre o referencia…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Buscar pagos"
              />
              {showStaffMobileChrome && (
                <Button
                  size="sm"
                  className="h-10 min-h-10 w-10 shrink-0 rounded-xl p-0"
                  onClick={() => openRegisterModal()}
                  aria-label="Registrar pago"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <FilterChips
              fullWidth
              className="sm:w-auto"
              options={[
                { value: '', label: 'Todos' },
                {
                  value: 'pending',
                  label: 'Pendientes',
                  count: adminStats?.stats?.pendingPayments,
                },
                { value: 'approved', label: 'Aprobados' },
                { value: 'rejected', label: 'Rechazados' },
              ]}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            />
          </>
        )}

        {paymentsError ? (
          <EmptyState
            icon={CreditCard}
            title="No se pudieron cargar los pagos"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button size="sm" onClick={() => void refetchPayments()}>
                Reintentar
              </Button>
            }
          />
        ) : isMember && !loading && payments.length === 0 && !statusFilter ? (
          <div className="mx-auto flex min-h-[min(48vh,26rem)] w-full max-w-sm flex-col justify-center">
            <EmptyState
              variant="motivational"
              icon={CreditCard}
              title="Aún sin pagos"
              description="Usa Reportar pago arriba para enviar tu comprobante y activar la membresía."
              className="border-0 bg-transparent shadow-none"
            />
          </div>
        ) : isMember && !loading && payments.length === 0 && statusFilter ? (
          <div className="mx-auto flex min-h-[min(36vh,20rem)] w-full max-w-sm flex-col justify-center">
            <EmptyState
              variant="motivational"
              icon={CreditCard}
              title="Sin resultados"
              description={
                statusFilter === 'pending'
                  ? 'No tienes pagos pendientes de revisión.'
                  : statusFilter === 'approved'
                    ? 'Aún no tienes pagos aprobados.'
                    : 'No tienes pagos rechazados.'
              }
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setStatusFilter('');
                    setPage(1);
                  }}
                >
                  Ver todos
                </Button>
              }
              className="border-0 bg-transparent shadow-none"
            />
          </div>
        ) : (
          <Card
            padding="none"
            rounded="xl"
            className={cn(
              'overflow-hidden',
              isMember &&
                'border-0 bg-transparent shadow-none lg:border lg:border-zinc-200/70 lg:bg-white lg:shadow-sm dark:lg:border-zinc-800/80 dark:lg:bg-zinc-900'
            )}
          >
            {isMember ? (
              <>
                <div className="mx-auto w-full max-w-lg space-y-2 lg:hidden">
                  {loading ? (
                    <ListRowSkeleton rows={4} />
                  ) : (
                    <>
                      {payments.map((payment) => (
                        <PaymentMobileCard
                          key={payment.id}
                          payment={payment}
                          onProofPreview={setProofPreview}
                        />
                      ))}
                      <p className="px-1 pt-1 text-center text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
                        Los pendientes se revisan en recepción. Si rechazan uno, te avisamos en
                        Mensajes.
                      </p>
                    </>
                  )}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                    <thead className="bg-zinc-50 text-[10px] font-semibold text-zinc-500 sm:text-xs dark:bg-zinc-800/50 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2.5 lg:px-5">Monto (USD)</th>
                        <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                        <th className="px-3 py-2.5 lg:px-5">Método</th>
                        <th className="px-3 py-2.5 lg:px-5">Referencia</th>
                        <th className="px-3 py-2.5 lg:px-5">Comprobante</th>
                        <th className="px-3 py-2.5 lg:px-5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {loading ? (
                        <>
                          <TableRowSkeleton cols={6} />
                          <TableRowSkeleton cols={6} />
                          <TableRowSkeleton cols={6} />
                          <TableRowSkeleton cols={6} />
                        </>
                      ) : payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-300"
                          >
                            No hay pagos registrados
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                          >
                            <td className="px-3 py-2.5 font-semibold text-zinc-900 tabular-nums lg:px-5 dark:text-white">
                              ${payment.amount_usd}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-500 lg:px-5 dark:text-zinc-400">
                              {formatPaymentDate(payment.created_at)}
                            </td>
                            <td className="px-3 py-2.5 text-zinc-500 capitalize lg:px-5 dark:text-zinc-400">
                              {formatPaymentMethod(payment.method)}
                            </td>
                            <td
                              className="max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] text-zinc-400 lg:max-w-[16rem] lg:px-5 dark:text-zinc-300"
                              title={payment.reference}
                            >
                              {payment.reference}
                            </td>
                            <td className="px-3 py-2.5 lg:px-5">
                              {payment.proof_url ? (
                                <ProofPreviewButton onClick={() => setProofPreview(payment)} />
                              ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 lg:px-5">
                              <Badge
                                variant={paymentStatusVariant(payment.status)}
                                className="px-1.5 py-0 text-[9px]"
                              >
                                {paymentStatusLabel(payment.status)}
                              </Badge>
                              {payment.status === 'rejected' && (
                                <p className="mt-1 max-w-[12rem] text-[10px] leading-snug text-red-500/90">
                                  {payment.rejection_reason?.trim()
                                    ? `Motivo: ${payment.rejection_reason.trim()}`
                                    : 'No verificado'}{' '}
                                  ·{' '}
                                  <Link to="/messages" className="font-semibold underline">
                                    Mensajes
                                  </Link>
                                </p>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="lg:hidden">
                  {loading ? (
                    <div className="px-3 py-2">
                      <ListRowSkeleton rows={4} />
                    </div>
                  ) : payments.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title={search ? 'Sin resultados' : 'Sin pagos registrados'}
                      description={
                        search
                          ? 'Prueba otro nombre o referencia, o limpia la búsqueda.'
                          : 'Los reportes de miembros aparecerán aquí para revisión.'
                      }
                      action={
                        search ? undefined : (
                          <Button size="sm" onClick={() => openRegisterModal()}>
                            <Plus className="h-4 w-4" />
                            Registrar pago
                          </Button>
                        )
                      }
                    />
                  ) : (
                    <div className="space-y-2 px-1 py-1">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-brand text-base leading-none font-bold tabular-nums">
                                  ${payment.amount_usd}
                                </p>
                                <Badge
                                  variant={paymentStatusVariant(payment.status)}
                                  className="px-1.5 py-0 text-[9px]"
                                >
                                  {paymentStatusLabel(payment.status)}
                                </Badge>
                              </div>
                              <p className="mt-1.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                                Miembro
                              </p>
                              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                                {payment.user_name}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                                <time dateTime={payment.created_at}>
                                  {formatPaymentDate(payment.created_at)}
                                </time>
                                <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                                <span className="capitalize">
                                  {formatPaymentMethod(payment.method)}
                                </span>
                              </p>
                              {payment.reference ? (
                                <p
                                  className="mt-0.5 truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-500"
                                  title={payment.reference}
                                >
                                  Ref. {payment.reference}
                                </p>
                              ) : null}
                            </div>
                            {payment.proof_url ? (
                              <ProofPreviewButton
                                onClick={() => setProofPreview(payment)}
                                className="h-9 w-9 shrink-0"
                              />
                            ) : null}
                          </div>
                          {isStaffPayment && payment.status === 'pending' ? (
                            <div className="mt-2.5 flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openApproveModal(payment)}
                                className="h-9 min-h-9 flex-1 border-emerald-500/35 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                              >
                                <Check className="h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRejectReason('');
                                  setActionError('');
                                  setRejectTarget(payment);
                                }}
                                className="h-9 min-h-9 flex-1 border-red-500/35 bg-red-500/5 text-red-600 hover:bg-red-500/15 dark:text-red-400"
                              >
                                <X className="h-4 w-4" />
                                Rechazar
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                    <thead className="bg-zinc-50 text-[10px] font-semibold text-zinc-500 sm:text-xs dark:bg-zinc-800/50 dark:text-zinc-400">
                      <tr>
                        <th className="px-3 py-2.5 lg:px-5">Usuario</th>
                        <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                        <th className="px-3 py-2.5 lg:px-5">Monto (USD)</th>
                        <th className="px-3 py-2.5 lg:px-5">Método</th>
                        <th className="px-3 py-2.5 lg:px-5">Referencia</th>
                        <th className="px-3 py-2.5 lg:px-5">Comprobante</th>
                        <th className="px-3 py-2.5 lg:px-5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {loading ? (
                        <>
                          <TableRowSkeleton cols={7} />
                          <TableRowSkeleton cols={7} />
                          <TableRowSkeleton cols={7} />
                          <TableRowSkeleton cols={7} />
                        </>
                      ) : payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-300"
                          >
                            {search
                              ? 'Sin resultados para esa búsqueda'
                              : 'No hay pagos registrados'}
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                          >
                            <td className="px-3 py-2.5 font-medium text-zinc-700 lg:px-5 dark:text-zinc-200">
                              {payment.user_name}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-500 lg:px-5 dark:text-zinc-400">
                              {formatPaymentDate(payment.created_at)}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-zinc-900 tabular-nums lg:px-5 dark:text-white">
                              ${payment.amount_usd}
                            </td>
                            <td className="px-3 py-2.5 text-zinc-500 capitalize lg:px-5 dark:text-zinc-400">
                              {formatPaymentMethod(payment.method)}
                            </td>
                            <td
                              className="max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] text-zinc-400 lg:max-w-[16rem] lg:px-5 dark:text-zinc-300"
                              title={payment.reference}
                            >
                              {payment.reference}
                            </td>
                            <td className="px-3 py-2.5 lg:px-5">
                              {payment.proof_url ? (
                                <ProofPreviewButton onClick={() => setProofPreview(payment)} />
                              ) : (
                                <span className="text-xs text-zinc-400 dark:text-zinc-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 lg:px-5">
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant={paymentStatusVariant(payment.status)}
                                  className="px-1.5 py-0 text-[9px]"
                                >
                                  {paymentStatusLabel(payment.status)}
                                </Badge>
                                {isStaffPayment && payment.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openApproveModal(payment)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                                      aria-label="Aprobar pago"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectReason('');
                                        setActionError('');
                                        setRejectTarget(payment);
                                      }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                                      aria-label="Rechazar pago"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              label="pagos"
            />
          </Card>
        )}

        <PaymentRegisterModal
          open={showModal}
          onClose={closeRegisterModal}
          isStaffPayment={isStaffPayment}
          isMember={isMember}
          onSubmit={handleSubmit}
          submitError={submitError}
          fieldErrors={fieldErrors}
          onClearFieldError={(key) => setFieldErrors((prev) => ({ ...prev, [key]: '' }))}
          loadingMembers={loadingMembers}
          memberOptions={memberOptions}
          selectedMemberId={selectedMemberId}
          onSelectedMemberIdChange={setSelectedMemberId}
          membershipPlans={membershipPlans}
          selectedPlanId={selectedPlanId}
          onPlanSelect={(planId) => {
            setSelectedPlanId(planId);
            const plan = membershipPlans.find((p) => String(p.id) === planId);
            if (plan) setAmountUsd(String(plan.price_usd));
          }}
          amountUsd={amountUsd}
          onAmountUsdChange={setAmountUsd}
          method={method}
          onMethodChange={setMethod}
          needsBsRate={needsBsRate}
          exchangeRate={exchangeRate}
          exchangeRateLoading={exchangeRateLoading}
          exchangeRateError={!!exchangeRateError}
          amountBs={amountBs}
          onRefetchExchangeRate={() => void refetchExchangeRate()}
          reference={reference}
          onReferenceChange={setReference}
          file={file}
          onFileChange={setFile}
          submitting={submitting}
        />

        <PaymentActionModals
          isStaffPayment={isStaffPayment}
          approveTarget={approveTarget}
          onCloseApprove={() => setApproveTarget(null)}
          membershipPlans={membershipPlans}
          selectedPlanId={selectedPlanId}
          onSelectedPlanIdChange={setSelectedPlanId}
          approving={approving}
          onApprove={handleApprove}
          rejectTarget={rejectTarget}
          onCloseReject={() => {
            setRejectTarget(null);
            setRejectReason('');
            setActionError('');
          }}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          actionError={actionError}
          rejecting={rejecting}
          onReject={handleReject}
          proofPreview={proofPreview}
          onCloseProof={() => setProofPreview(null)}
        />
      </div>
    </PullToRefreshContainer>
  );
}
