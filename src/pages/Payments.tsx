import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { dateLocale } from '../lib/dateLocale';
import { apiFetch, parseJsonResponse, paymentProofUrl } from '../lib/api';
import { Plus, Upload, Check, X, FileImage, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useSearchParams, Link } from 'react-router-dom';
import { Button, Card, Modal, PageHeader, Label, Input, Select, PaginationBar, Badge, FilterChips, BackToDashboardLink, EmptyState, Spinner } from '../components/ui';
import { useToastOptional } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { clientLogger } from '../lib/clientLogger';
import { usePaymentsQuery, useInvalidatePayments } from '../hooks/queries/usePaymentsQuery';
import { useMembershipPlansQuery } from '../hooks/queries/useMembershipsQuery';

interface Payment {
  id: number;
  user_name: string;
  amount_usd: number;
  amount_bs: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reference: string;
  proof_url?: string | null;
}

const EXCHANGE_RATE = Number(import.meta.env.VITE_EXCHANGE_RATE ?? 40.5);

function formatPaymentDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy · HH:mm", { locale: dateLocale });
  } catch {
    return iso;
  }
}

function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, ' ');
}

function paymentStatusLabel(status: Payment['status']): string {
  if (status === 'approved') return 'Aprobado';
  if (status === 'rejected') return 'Rechazado';
  return 'Pendiente';
}

function paymentStatusVariant(status: Payment['status']): 'success' | 'danger' | 'warning' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
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
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-brand hover:bg-brand/10 transition-colors',
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
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = user?.role === 'member' ? 10 : 20;

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
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [proofPreview, setProofPreview] = useState<Payment | null>(null);
  const [actionError, setActionError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [searchParams] = useSearchParams();
  const toast = useToastOptional();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'pending' || status === 'approved' || status === 'rejected') {
      setStatusFilter(status);
      setPage(1);
    }
  }, [searchParams]);

  const apiFetchPayments = () => invalidatePayments();

  useEffect(() => {
    const usd = parseFloat(amountUsd);
    if (!Number.isNaN(usd) && usd > 0) {
      setAmountBs((usd * EXCHANGE_RATE).toFixed(2));
    } else {
      setAmountBs('');
    }
  }, [amountUsd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const formData = new FormData();
    formData.append('user_id', user!.id.toString());
    formData.append('amount_usd', amountUsd);
    formData.append('amount_bs', amountBs);
    formData.append('method', method);
    formData.append('reference', reference);
    formData.append('exchange_rate', String(EXCHANGE_RATE));
    if (file) formData.append('proof', file);

    try {
      const res = await apiFetch('/api/payments', {
        method: 'POST',
        body: formData,
      });
      await parseJsonResponse(res);

      setShowModal(false);
      setAmountUsd('');
      setReference('');
      setFile(null);
      setSelectedPlanId('');
      void apiFetchPayments();
      await memberStats?.refresh();
      toast?.success('Pago reportado correctamente');
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
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={
          isMember ? (
            <>Mis <span className="text-brand">pagos</span></>
          ) : (
            <>Gestión de <span className="text-brand">pagos</span></>
          )
        }
        subtitle={
          isMember
            ? 'Reporta tu pago para activar la membresía'
            : 'Aprueba reportes de ingresos'
        }
        action={
          isMember ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <BackToDashboardLink />
              <Button
                size="sm"
                className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4 whitespace-nowrap"
                onClick={() => {
                  setSubmitError('');
                  setShowModal(true);
                }}
                aria-label="Reportar pago"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Reportar pago</span>
              </Button>
            </div>
          ) : (
            <BackToDashboardLink />
          )
        }
      />

      {isMember && !loading && (
        <p className="text-[11px] text-zinc-500 px-0.5">
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
          <>
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <div className="p-8 flex justify-center"><Spinner /></div>
              ) : payments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="Sin pagos registrados"
                  description="Cuando reportes un pago, aparecerá aquí con su estado."
                  action={
                    <Button size="sm" onClick={() => { setSubmitError(''); setShowModal(true); }}>
                      <Plus className="h-4 w-4" />
                      Reportar pago
                    </Button>
                  }
                />
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-base sm:text-lg font-bold text-brand tabular-nums leading-none">
                          ${payment.amount_usd}
                        </p>
                        <p className="mt-1 text-[10px] leading-snug text-zinc-500 truncate">
                          <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
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
                      <div className="flex items-center gap-1 shrink-0">
                        {payment.proof_url && (
                          <ProofPreviewButton onClick={() => setProofPreview(payment)} className="h-8 w-8" />
                        )}
                        <Badge variant={paymentStatusVariant(payment.status)} className="text-[9px] px-1.5 py-0 shrink-0">
                          {paymentStatusLabel(payment.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] sm:text-xs font-semibold text-zinc-500">
                  <tr>
                    <th className="px-3 lg:px-5 py-2.5">Monto (USD)</th>
                    <th className="px-3 lg:px-5 py-2.5">Fecha</th>
                    <th className="px-3 lg:px-5 py-2.5">Método</th>
                    <th className="px-3 lg:px-5 py-2.5">Referencia</th>
                    <th className="px-3 lg:px-5 py-2.5">Comprobante</th>
                    <th className="px-3 lg:px-5 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center"><Spinner /></td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-400 text-sm">No hay pagos registrados</td></tr>
                  ) : payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-3 lg:px-5 py-2.5 font-semibold text-zinc-900 dark:text-white tabular-nums">${payment.amount_usd}</td>
                      <td className="px-3 lg:px-5 py-2.5 text-zinc-500 whitespace-nowrap">{formatPaymentDate(payment.created_at)}</td>
                      <td className="px-3 lg:px-5 py-2.5 text-zinc-500 capitalize">{formatPaymentMethod(payment.method)}</td>
                      <td className="px-3 lg:px-5 py-2.5 font-mono text-[10px] text-zinc-400 max-w-[10rem] truncate" title={payment.reference}>{payment.reference}</td>
                      <td className="px-3 lg:px-5 py-2.5">
                        {payment.proof_url ? (
                          <ProofPreviewButton onClick={() => setProofPreview(payment)} />
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 lg:px-5 py-2.5">
                        <Badge variant={paymentStatusVariant(payment.status)} className="text-[9px] px-1.5 py-0">
                          {paymentStatusLabel(payment.status)}
                        </Badge>
                        {payment.status === 'rejected' && (
                          <p className="mt-1 text-[10px] text-red-500/90 max-w-[12rem] leading-snug">
                            No verificado · <Link to="/messages" className="underline font-semibold">Mensajes</Link>
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
        <>
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Sin pagos registrados"
              description="Los reportes de miembros aparecerán aquí para revisión."
            />
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                      {payment.user_name}
                    </p>
                    <p className="mt-0.5 text-base font-bold text-brand tabular-nums leading-none">
                      ${payment.amount_usd}
                    </p>
                    <p className="mt-1 text-[10px] leading-snug text-zinc-500 truncate">
                      <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
                      <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="capitalize">{formatPaymentMethod(payment.method)}</span>
                      {payment.reference && (
                        <>
                          <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                          <span className="font-mono" title={payment.reference}>Ref: {payment.reference}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                      <ProofPreviewButton onClick={() => setProofPreview(payment)} className="h-8 w-8" />
                    )}
                    <Badge variant={paymentStatusVariant(payment.status)} className="text-[9px] px-1.5 py-0">
                      {paymentStatusLabel(payment.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] sm:text-xs font-semibold text-zinc-500">
              <tr>
                <th className="px-3 lg:px-5 py-2.5">Usuario</th>
                <th className="px-3 lg:px-5 py-2.5">Fecha</th>
                <th className="px-3 lg:px-5 py-2.5">Monto (USD)</th>
                <th className="px-3 lg:px-5 py-2.5">Método</th>
                <th className="px-3 lg:px-5 py-2.5">Referencia</th>
                <th className="px-3 lg:px-5 py-2.5">Comprobante</th>
                <th className="px-3 lg:px-5 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                 <tr><td colSpan={7} className="px-5 py-8 text-center"><Spinner /></td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-zinc-400 text-sm">No hay pagos registrados</td></tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 lg:px-5 py-2.5 font-medium text-zinc-700 dark:text-zinc-200">{payment.user_name}</td>
                  <td className="px-3 lg:px-5 py-2.5 text-zinc-500 whitespace-nowrap">{formatPaymentDate(payment.created_at)}</td>
                  <td className="px-3 lg:px-5 py-2.5 font-semibold text-zinc-900 dark:text-white tabular-nums">${payment.amount_usd}</td>
                  <td className="px-3 lg:px-5 py-2.5 text-zinc-500 capitalize">{formatPaymentMethod(payment.method)}</td>
                  <td className="px-3 lg:px-5 py-2.5 font-mono text-[10px] text-zinc-400 max-w-[10rem] truncate" title={payment.reference}>{payment.reference}</td>
                  <td className="px-3 lg:px-5 py-2.5">
                    {payment.proof_url ? (
                      <ProofPreviewButton onClick={() => setProofPreview(payment)} />
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 lg:px-5 py-2.5">
                    <div className="flex items-center gap-1">
                      <Badge variant={paymentStatusVariant(payment.status)} className="text-[9px] px-1.5 py-0">
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
              ))}
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

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setSubmitError(''); }}
        title={<>REPORTAR <span className="text-brand">PAGO</span></>}
        maxWidth="xl"
        scrollable
      >
        <form onSubmit={handleSubmit} className="page-stack">
          {submitError && (
            <p className="text-sm font-bold text-red-500">{submitError}</p>
          )}
          {isMember && membershipPlans.length > 0 && (
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
            <Label>Monto (Bs) — tasa {EXCHANGE_RATE}</Label>
            <Input type="number" readOnly className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400" value={amountBs} />
          </div>
          <div>
            <Label>Método</Label>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="pago_movil">Pago móvil</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo_usd">Efectivo USD</option>
            </Select>
          </div>
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
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-200 dark:border-zinc-700 border-dashed rounded-xl cursor-pointer bg-zinc-50 dark:bg-zinc-800/10 hover:bg-brand/5 hover:border-brand/50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-zinc-400 group-hover:text-brand transition-colors" />
                  <p className="text-xs font-medium text-zinc-500 group-hover:text-brand transition-colors">Adjuntar comprobante</p>
                </div>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            {file && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 mt-2 text-center">Seleccionado: {file.name}</p>}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="ghost" className="flex-1" size="lg" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" size="lg">
              Enviar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!approveTarget && isStaffPayment}
        onClose={() => setApproveTarget(null)}
        title={<>Aprobar <span className="text-emerald-500">pago</span></>}
      >
        {approveTarget && (
          <>
            <p className="text-sm text-zinc-500 mb-6">
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
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setApproveTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
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
        onClose={() => { setRejectTarget(null); setActionError(''); }}
        title={<>Rechazar <span className="text-red-500">pago</span></>}
      >
        {rejectTarget && (
          <>
            <p className="text-sm text-zinc-500 mb-4">
              ¿Rechazar el pago de <strong>{rejectTarget.user_name}</strong> por ${rejectTarget.amount_usd}?
            </p>
            {actionError && (
              <p className="text-sm font-bold text-red-500 mb-4">{actionError}</p>
            )}
            <div className="flex gap-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setRejectTarget(null)}>
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {proofPreview.user_name && <span>{proofPreview.user_name} · </span>}
              ${proofPreview.amount_usd}
              {proofPreview.reference ? ` · Ref: ${proofPreview.reference}` : ''}
            </p>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
              <img
                src={paymentProofUrl(proofPreview.id)}
                alt="Comprobante de pago"
                className="w-full max-h-[min(70vh,640px)] object-contain mx-auto"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href={paymentProofUrl(proofPreview.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-brand hover:text-brand"
              >
                Abrir en pestaña nueva
              </a>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
