import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse, paymentProofUrl } from '../lib/api';
import { Plus, Upload, Check, X, FileImage, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Button,
  Card,
  Modal,
  PageHeader,
  Label,
  Input,
  Select,
  PaginationBar,
  Badge,
  FilterChips,
  BackToDashboardLink,
  EmptyState,
  Spinner,
} from '../components/ui';
import { useToastOptional } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { usePaymentsQuery, useInvalidatePayments } from '../hooks/queries/usePaymentsQuery';
import { useMembershipPlansQuery } from '../hooks/queries/useMembershipsQuery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import { ResponsiveTable } from '../components/ResponsiveTable';
import {
  formatPaymentDate,
  formatPaymentMethod,
  paymentStatusLabel,
  paymentStatusVariant,
  type Payment,
} from './payments/helpers';
import { formatBsRateLabel, useExchangeRateQuery } from '../hooks/queries/useExchangeRateQuery';

interface MemberOption {
  id: number;
  full_name: string;
  cedula: string | null;
}

function PaymentRejectionNote() {
  return (
    <p className="mt-1 text-[10px] leading-snug text-red-500/90">
      Comprobante no verificado.{' '}
      <Link to="/messages" className="font-semibold underline hover:text-red-400">
        Consulta Mensajes
      </Link>
    </p>
  );
}

function ProofPreviewButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-brand hover:bg-brand/10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 transition-colors dark:border-zinc-700',
        className
      )}
      aria-label="Ver comprobante"
    >
      <FileImage className="h-4 w-4" />
    </button>
  );
}

export default function Payments() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const isMember = user?.role === 'member';
  const isStaffPayment = user?.role === 'admin' || user?.role === 'receptionist';
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
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = user?.role === 'member' ? 10 : 20;
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  const { data: paymentsData, isPending: loading } = usePaymentsQuery({
    page,
    pageSize,
    statusFilter,
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
  const [proofPreview, setProofPreview] = useState<Payment | null>(null);
  const [actionError, setActionError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [searchParams] = useSearchParams();
  const toast = useToastOptional();

  const openRegisterModal = useCallback((memberId?: string) => {
    setSubmitError('');
    setSelectedMemberId(memberId ?? '');
    setShowModal(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setShowModal(false);
    setSubmitError('');
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
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('register') === '1' && isStaffPayment) {
      openRegisterModal(searchParams.get('memberId') ?? undefined);
    }
  }, [searchParams, isStaffPayment, openRegisterModal]);

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
    if (isStaffPayment && !isMember && !selectedMemberId) {
      setSubmitError('Seleccione un miembro');
      return;
    }
    if (needsBsRate && !exchangeRate) {
      setSubmitError('La tasa de cambio no está disponible. Intenta de nuevo en unos minutos.');
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
        isStaffPayment && !isMember
          ? 'Pago registrado correctamente'
          : 'Pago reportado correctamente'
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo enviar el pago');
    }
  };

  const openApproveModal = (payment: Payment) => {
    setApproveTarget(payment);
    setSelectedPlanId('');
  };

  const handleApprove = async () => {
    if (!approveTarget) return;

    try {
      const body = selectedPlanId ? { membership_id: Number(selectedPlanId) } : {};
      const res = await apiFetch(`/api/payments/${approveTarget.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await parseJsonResponse(res);

      setApproveTarget(null);
      apiFetchPayments();
      await adminStats?.refresh();
      toast?.success('Pago aprobado');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'No se pudo aprobar');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    try {
      const res = await apiFetch(`/api/payments/${rejectTarget.id}/reject`, { method: 'POST' });
      await parseJsonResponse(res);
      setRejectTarget(null);
      apiFetchPayments();
      await adminStats?.refresh();
      toast?.success('Pago rechazado');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo rechazar');
    }
  };

  return (
    <PullToRefreshContainer pullDistance={pullPayments} isRefreshing={refreshingPayments}>
      <div className="page-stack-tight" {...paymentsHandlers}>
        <PageHeader
          compact
          title={
            isMember ? (
              <>
                Mis <span className="text-brand">pagos</span>
              </>
            ) : (
              <>
                Gestión de <span className="text-brand">pagos</span>
              </>
            )
          }
          subtitle={
            isMember
              ? 'Reporta tu pago para activar la membresía'
              : 'Registra pagos en mostrador y aprueba reportes de miembros'
          }
          action={
            isMember ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <BackToDashboardLink />
                <Button
                  size="sm"
                  className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 whitespace-nowrap sm:w-auto sm:px-4"
                  onClick={() => openRegisterModal()}
                  aria-label="Reportar pago"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Reportar pago</span>
                </Button>
              </div>
            ) : isStaffPayment ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <BackToDashboardLink />
                <Button
                  size="sm"
                  className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 whitespace-nowrap sm:w-auto sm:px-4"
                  onClick={() => openRegisterModal()}
                  aria-label="Registrar pago"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Registrar pago</span>
                </Button>
              </div>
            ) : (
              <BackToDashboardLink />
            )
          }
        />

        {isMember && !loading && (
          <p className="px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {total} pago{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
            {statusFilter ? ` · ${paymentStatusLabel(statusFilter as Payment['status'])}` : ''}
          </p>
        )}

        {isMember && (
          <FilterChips
            fullWidth
            className="sm:w-auto"
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
          <FilterChips
            fullWidth
            className="sm:w-auto"
            options={[
              { value: '', label: 'Todos' },
              { value: 'pending', label: 'Pendientes', count: adminStats?.stats?.pendingPayments },
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

        <Card padding="none" rounded="xl" className="overflow-hidden">
          {isMember ? (
            <ResponsiveTable
              items={payments}
              keyExtractor={(payment) => payment.id}
              loading={loading}
              loadingSkeleton={
                <>
                  <div className="flex justify-center p-8 lg:hidden">
                    <Spinner />
                  </div>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                      <tbody>
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center">
                            <Spinner />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              }
              emptyState={
                <EmptyState
                  icon={CreditCard}
                  title="Sin pagos registrados"
                  description="Cuando reportes un pago, aparecerá aquí con su estado."
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        setSubmitError('');
                        setShowModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Reportar pago
                    </Button>
                  }
                />
              }
              mobileClassName="divide-y divide-zinc-100 dark:divide-zinc-800"
              mobile={(payment) => (
                <div className="px-3 py-2.5">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-brand text-base leading-none font-bold tabular-nums sm:text-lg">
                        ${payment.amount_usd}
                      </p>
                      <p className="mt-1 truncate text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                        <time dateTime={payment.created_at}>
                          {formatPaymentDate(payment.created_at)}
                        </time>
                        <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                        <span className="capitalize">{formatPaymentMethod(payment.method)}</span>
                        {payment.reference && (
                          <>
                            <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                            <span className="font-mono" title={payment.reference}>
                              Ref: {payment.reference}
                            </span>
                          </>
                        )}
                      </p>
                      {payment.status === 'rejected' && <PaymentRejectionNote />}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {payment.proof_url && (
                        <ProofPreviewButton
                          onClick={() => setProofPreview(payment)}
                          className="h-8 w-8"
                        />
                      )}
                      <Badge
                        variant={paymentStatusVariant(payment.status)}
                        className="shrink-0 px-1.5 py-0 text-[9px]"
                      >
                        {paymentStatusLabel(payment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              header={
                <tr>
                  <th className="px-3 py-2.5 lg:px-5">Monto (USD)</th>
                  <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                  <th className="px-3 py-2.5 lg:px-5">Método</th>
                  <th className="px-3 py-2.5 lg:px-5">Referencia</th>
                  <th className="px-3 py-2.5 lg:px-5">Comprobante</th>
                  <th className="px-3 py-2.5 lg:px-5">Estado</th>
                </tr>
              }
              desktop={(payment) => (
                <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
                    className="max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] text-zinc-400 lg:px-5 dark:text-zinc-300"
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
                        No verificado ·{' '}
                        <Link to="/messages" className="font-semibold underline">
                          Mensajes
                        </Link>
                      </p>
                    )}
                  </td>
                </tr>
              )}
            />
          ) : (
            <ResponsiveTable
              items={payments}
              keyExtractor={(payment) => payment.id}
              loading={loading}
              loadingSkeleton={
                <>
                  <div className="flex justify-center p-8 lg:hidden">
                    <Spinner />
                  </div>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                      <tbody>
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center">
                            <Spinner />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              }
              emptyState={
                <EmptyState
                  icon={CreditCard}
                  title="Sin pagos registrados"
                  description="Los reportes de miembros aparecerán aquí para revisión."
                />
              }
              mobileClassName="divide-y divide-zinc-100 dark:divide-zinc-800"
              mobile={(payment) => (
                <div className="px-3 py-2.5">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                        {payment.user_name}
                      </p>
                      <p className="text-brand mt-0.5 text-base leading-none font-bold tabular-nums">
                        ${payment.amount_usd}
                      </p>
                      <p className="mt-1 truncate text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                        <time dateTime={payment.created_at}>
                          {formatPaymentDate(payment.created_at)}
                        </time>
                        <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                        <span className="capitalize">{formatPaymentMethod(payment.method)}</span>
                        {payment.reference && (
                          <>
                            <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                            <span className="font-mono" title={payment.reference}>
                              Ref: {payment.reference}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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
                            onClick={() => setRejectTarget(payment)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                            aria-label="Rechazar pago"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {payment.proof_url && (
                        <ProofPreviewButton
                          onClick={() => setProofPreview(payment)}
                          className="h-8 w-8"
                        />
                      )}
                      <Badge
                        variant={paymentStatusVariant(payment.status)}
                        className="px-1.5 py-0 text-[9px]"
                      >
                        {paymentStatusLabel(payment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              header={
                <tr>
                  <th className="px-3 py-2.5 lg:px-5">Usuario</th>
                  <th className="px-3 py-2.5 lg:px-5">Fecha</th>
                  <th className="px-3 py-2.5 lg:px-5">Monto (USD)</th>
                  <th className="px-3 py-2.5 lg:px-5">Método</th>
                  <th className="px-3 py-2.5 lg:px-5">Referencia</th>
                  <th className="px-3 py-2.5 lg:px-5">Comprobante</th>
                  <th className="px-3 py-2.5 lg:px-5">Estado</th>
                </tr>
              }
              desktop={(payment) => (
                <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
                    className="max-w-[10rem] truncate px-3 py-2.5 font-mono text-[10px] text-zinc-400 lg:px-5 dark:text-zinc-300"
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
                            onClick={() => setRejectTarget(payment)}
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
              )}
            />
          )}
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            label="pagos"
          />
        </Card>

        <Modal
          open={showModal}
          onClose={closeRegisterModal}
          title={
            isStaffPayment && !isMember ? (
              <>
                REGISTRAR <span className="text-brand">PAGO</span>
              </>
            ) : (
              <>
                REPORTAR <span className="text-brand">PAGO</span>
              </>
            )
          }
          maxWidth="xl"
          scrollable
        >
          <form onSubmit={handleSubmit} className="page-stack">
            {submitError && <p className="text-sm font-bold text-red-500">{submitError}</p>}
            {isStaffPayment && !isMember && (
              <div>
                <Label>Miembro</Label>
                {loadingMembers ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
                    <Spinner className="h-4 w-4" />
                    Cargando miembros…
                  </div>
                ) : (
                  <Select
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">Seleccionar miembro…</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                        {member.cedula ? ` — ${member.cedula}` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}
            {(isMember || isStaffPayment) && membershipPlans.length > 0 && (
              <div>
                <Label>Plan (referencia de monto)</Label>
                <Select
                  value={selectedPlanId}
                  onChange={(e) => {
                    setSelectedPlanId(e.target.value);
                    const plan = membershipPlans.find((p) => String(p.id) === e.target.value);
                    if (plan) setAmountUsd(String(plan.price_usd));
                  }}
                >
                  <option value="">Seleccionar plan...</option>
                  {membershipPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — ${plan.price_usd}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                required
                className="text-xl font-semibold"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="pago_movil">Pago móvil</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo_usd">Efectivo USD</option>
              </Select>
            </div>
            {needsBsRate && (
              <div>
                <Label>
                  Monto (Bs)
                  {exchangeRate ? ` — Tasa ${formatBsRateLabel(exchangeRate)}` : ' — Tasa BCV'}
                </Label>
                {exchangeRateLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
                    <Spinner className="h-4 w-4" />
                    Cargando tasa del día…
                  </div>
                ) : exchangeRateError || !exchangeRate ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-500">
                      No se pudo cargar la tasa de cambio oficial.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void refetchExchangeRate()}
                    >
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="number"
                    readOnly
                    className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400"
                    value={amountBs}
                  />
                )}
              </div>
            )}
            <div>
              <Label>Número de Referencia</Label>
              <Input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Referencia bancaria"
              />
            </div>
            <div>
              <Label>Comprobante (Captura)</Label>
              <div className="flex w-full items-center justify-center">
                <label className="hover:bg-brand/5 hover:border-brand/50 group flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-all dark:border-zinc-700 dark:bg-zinc-800/10">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="group-hover:text-brand mb-3 h-8 w-8 text-zinc-400 transition-colors dark:text-zinc-300" />
                    <p className="group-hover:text-brand text-xs font-medium text-zinc-500 transition-colors dark:text-zinc-400">
                      Adjuntar comprobante
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              {file && (
                <p className="mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-500">
                  Seleccionado: {file.name}
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                size="lg"
                onClick={closeRegisterModal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                disabled={needsBsRate && (exchangeRateLoading || !exchangeRate)}
              >
                Enviar
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          open={!!approveTarget && isStaffPayment}
          onClose={() => setApproveTarget(null)}
          title={
            <>
              Aprobar <span className="text-emerald-500">pago</span>
            </>
          }
        >
          {approveTarget && (
            <>
              <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                {approveTarget.user_name} — ${approveTarget.amount_usd}
              </p>
              <Label>Plan a asignar (opcional)</Label>
              <Select
                className="mb-6"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="">Detectar por monto del pago</option>
                {membershipPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — ${plan.price_usd} / {plan.duration_days} días
                  </option>
                ))}
              </Select>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setApproveTarget(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-500"
                  onClick={handleApprove}
                >
                  Aprobar
                </Button>
              </div>
            </>
          )}
        </Modal>

        <Modal
          open={!!rejectTarget}
          onClose={() => {
            setRejectTarget(null);
            setActionError('');
          }}
          title={
            <>
              Rechazar <span className="text-red-500">pago</span>
            </>
          }
        >
          {rejectTarget && (
            <>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                ¿Rechazar el pago de <strong>{rejectTarget.user_name}</strong> por $
                {rejectTarget.amount_usd}?
              </p>
              {actionError && <p className="mb-4 text-sm font-bold text-red-500">{actionError}</p>}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setRejectTarget(null)}
                >
                  Cancelar
                </Button>
                <Button type="button" variant="danger" className="flex-1" onClick={handleReject}>
                  Rechazar
                </Button>
              </div>
            </>
          )}
        </Modal>

        <Modal
          open={!!proofPreview}
          onClose={() => setProofPreview(null)}
          title="Comprobante de pago"
          maxWidth="lg"
          scrollable
        >
          {proofPreview && (
            <>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                {proofPreview.user_name && <span>{proofPreview.user_name} · </span>}$
                {proofPreview.amount_usd}
                {proofPreview.reference ? ` · Ref: ${proofPreview.reference}` : ''}
              </p>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <img
                  src={paymentProofUrl(proofPreview.id)}
                  alt="Comprobante de pago"
                  loading="lazy"
                  className="mx-auto max-h-[min(70dvh,640px)] w-full object-contain"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <a
                  href={paymentProofUrl(proofPreview.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand text-xs font-semibold"
                >
                  Abrir en pestaña nueva
                </a>
              </div>
            </>
          )}
        </Modal>
      </div>
    </PullToRefreshContainer>
  );
}
