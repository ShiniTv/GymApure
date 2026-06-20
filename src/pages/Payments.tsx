import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, parseJsonResponse, paymentProofUrl } from '../lib/api';
import { Plus, Upload, Check, X, FileImage } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Modal, PageHeader, Label, Input, Select, PaginationBar, Badge, Spinner, Skeleton, FilterChips } from '../components/ui';
import { useToastOptional } from '../context/ToastContext';
import { clientLogger } from '../lib/clientLogger';

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

interface PaginatedPayments {
  items: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

const EXCHANGE_RATE = Number(import.meta.env.VITE_EXCHANGE_RATE ?? 40.5);

export default function Payments() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const memberStats = useMemberStatsOptional();
  const isMember = user?.role === 'member';
  const isStaffPayment = user?.role === 'admin' || user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = user?.role === 'member' ? 10 : 20;

  // Form state
  const [amountUsd, setAmountUsd] = useState('');
  const [amountBs, setAmountBs] = useState('');
  const [method, setMethod] = useState('pago_movil');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [approveTarget, setApproveTarget] = useState<Payment | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<
    { id: number; name: string; price_usd: number; duration_days: number }[]
  >([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
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

  useEffect(() => {
    if (user?.role === 'member') {
      apiFetch('/api/memberships')
        .then((res) => parseJsonResponse<typeof membershipPlans>(res))
        .then((data) => setMembershipPlans(Array.isArray(data) ? data : []))
        .catch(() => setMembershipPlans([]));
    }
  }, [user?.id, user?.role]);

  const apiFetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiFetch(`/api/payments?${params.toString()}`);
      const data = await parseJsonResponse<PaginatedPayments>(res);
      setPayments(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
    } catch (err) {
      clientLogger.error('Failed to fetch payments', err);
      setPayments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    void apiFetchPayments();
  }, [apiFetchPayments]);

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

  const openApproveModal = async (payment: Payment) => {
    setApproveTarget(payment);
    setSelectedPlanId('');
    try {
      const res = await apiFetch('/api/memberships');
      const data = await parseJsonResponse<typeof membershipPlans>(res);
      setMembershipPlans(Array.isArray(data) ? data : []);
    } catch {
      setMembershipPlans([]);
    }
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
    <div className="space-y-6">
      <PageHeader
        title={
          isMember ? (
            <>Mis <span className="text-orange-500">pagos</span></>
          ) : (
            <>Gestión de <span className="text-orange-500">pagos</span></>
          )
        }
        subtitle={
          isMember
            ? 'Reporta tu pago y el admin activará tu membresía al aprobarlo'
            : 'Administra y aprueba los reportes de ingresos'
        }
        action={
          isMember ? (
            <Button onClick={() => { setSubmitError(''); setShowModal(true); }}>
              <Plus className="h-5 w-5" />
              Reportar Pago
            </Button>
          ) : undefined
        }
      />

      {isStaffPayment && (
        <FilterChips
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

      <Card padding="none" rounded="3xl" className="overflow-hidden">
        {isMember ? (
          <>
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <div className="p-12 flex justify-center text-zinc-400 text-sm">Cargando pagos...</div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 text-sm">No hay pagos registrados</div>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900 dark:text-white">${payment.amount_usd}</p>
                      <Badge
                        variant={
                          payment.status === 'approved'
                            ? 'success'
                            : payment.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {payment.status === 'approved'
                          ? 'Aprobado'
                          : payment.status === 'rejected'
                            ? 'Rechazado'
                            : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {payment.method.replace('_', ' ')} · {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-mono text-zinc-400">Ref: {payment.reference}</p>
                    {payment.proof_url && (
                      <a
                        href={paymentProofUrl(payment.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-500"
                      >
                        <FileImage className="h-4 w-4" />
                        Ver comprobante
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500">
                  <tr>
                    <th className="px-8 py-5">Monto (USD)</th>
                    <th className="px-8 py-5">Método</th>
                    <th className="px-8 py-5">Referencia</th>
                    <th className="px-8 py-5">Comprobante</th>
                    <th className="px-8 py-5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr><td colSpan={5} className="px-8 py-12 text-center text-zinc-400">Cargando pagos...</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-12 text-center text-zinc-400">No hay pagos registrados</td></tr>
                  ) : payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-8 py-5 font-semibold text-zinc-900 dark:text-white">${payment.amount_usd}</td>
                      <td className="px-8 py-5 text-sm text-zinc-500 capitalize">{payment.method.replace('_', ' ')}</td>
                      <td className="px-8 py-5 font-mono text-[10px] opacity-50">{payment.reference}</td>
                      <td className="px-8 py-5">
                        {payment.proof_url ? (
                          <a href={paymentProofUrl(payment.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-500">
                            <FileImage className="h-4 w-4" /> Ver
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-8 py-5">
                        <Badge variant={payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning'}>
                          {payment.status === 'approved' ? 'Aprobado' : payment.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                        </Badge>
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
            <div className="p-12 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-sm">No hay pagos registrados</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900 dark:text-white text-sm">{payment.user_name}</p>
                  <Badge variant={payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning'}>
                    {payment.status === 'approved' ? 'Aprobado' : payment.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </Badge>
                </div>
                <p className="text-xl font-semibold text-orange-600">${payment.amount_usd}</p>
                {payment.proof_url && (
                  <a href={paymentProofUrl(payment.id)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                    <img src={paymentProofUrl(payment.id)} alt="Comprobante" loading="lazy" decoding="async" className="w-full max-h-40 object-cover" />
                  </a>
                )}
                {isStaffPayment && payment.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => openApproveModal(payment)}>
                      <Check className="h-4 w-4" /> Aprobar
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => setRejectTarget(payment)}>
                      <X className="h-4 w-4" /> Rechazar
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500">
              <tr>
                <th className="px-8 py-5">Usuario</th>
                <th className="px-8 py-5">Monto (USD)</th>
                <th className="px-8 py-5">Método</th>
                <th className="px-8 py-5">Referencia</th>
                <th className="px-8 py-5">Comprobante</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                 <tr><td colSpan={7} className="px-8 py-12 text-center text-zinc-400 text-sm">Cargando pagos...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-zinc-400 text-sm">No hay pagos registrados</td></tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-8 py-5 font-medium text-zinc-700 dark:text-zinc-200">{payment.user_name}</td>
                  <td className="px-8 py-5 font-semibold text-zinc-900 dark:text-white">${payment.amount_usd}</td>
                  <td className="px-8 py-5 text-sm text-zinc-500 capitalize">{payment.method.replace('_', ' ')}</td>
                  <td className="px-8 py-5 font-mono text-xs text-zinc-400">{payment.reference}</td>
                  <td className="px-8 py-5">
                    {payment.proof_url ? (
                      <a
                        href={paymentProofUrl(payment.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-500"
                      >
                        <FileImage className="h-4 w-4" />
                        Ver
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <Badge
                      variant={
                        payment.status === 'approved'
                          ? 'success'
                          : payment.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {payment.status === 'approved'
                        ? 'Aprobado'
                        : payment.status === 'rejected'
                          ? 'Rechazado'
                          : 'Pendiente'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isStaffPayment && payment.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openApproveModal(payment)} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-500" title="Aprobar">
                          <Check className="h-5 w-5" />
                        </button>
                        <button onClick={() => setRejectTarget(payment)} className="p-1 hover:bg-red-500/20 rounded text-red-500" title="Rechazar">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
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
        title={<>REPORTAR <span className="text-orange-500">PAGO</span></>}
        maxWidth="xl"
        scrollable
      >
        <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-200 dark:border-zinc-700 border-dashed rounded-xl cursor-pointer bg-zinc-50 dark:bg-zinc-800/10 hover:bg-orange-500/5 hover:border-orange-500/50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                  <p className="text-xs font-medium text-zinc-500 group-hover:text-orange-600 transition-colors">Adjuntar comprobante</p>
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
    </div>
  );
}
