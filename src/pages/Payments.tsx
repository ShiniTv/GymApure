import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Plus, Upload, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Payment {
  id: number;
  user_name: string;
  amount_usd: number;
  amount_bs: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reference: string;
}

const EXCHANGE_RATE = Number(import.meta.env.VITE_EXCHANGE_RATE ?? 40.5);

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    apiFetchPayments();
    if (user?.role === 'member') {
      apiFetch('/api/memberships')
        .then((res) => res.json())
        .then((data) => setMembershipPlans(Array.isArray(data) ? data : []))
        .catch(() => setMembershipPlans([]));
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    const usd = parseFloat(amountUsd);
    if (!Number.isNaN(usd) && usd > 0) {
      setAmountBs((usd * EXCHANGE_RATE).toFixed(2));
    } else {
      setAmountBs('');
    }
  }, [amountUsd]);

  const apiFetchPayments = async () => {
    try {
      const url = user?.role === 'member' ? `/api/payments?user_id=${user.id}` : '/api/payments';
      const res = await apiFetch(url);
      const data = await parseJsonResponse<Payment[]>(res);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', user!.id.toString());
    formData.append('amount_usd', amountUsd);
    formData.append('amount_bs', amountBs);
    formData.append('method', method);
    formData.append('reference', reference);
    formData.append('exchange_rate', String(EXCHANGE_RATE));
    if (file) formData.append('proof', file);

    const res = await apiFetch('/api/payments', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'No se pudo enviar el pago');
      return;
    }

    setShowModal(false);
    setAmountUsd('');
    setReference('');
    setFile(null);
    apiFetchPayments();
  };

  const openApproveModal = async (payment: Payment) => {
    setApproveTarget(payment);
    setSelectedPlanId('');
    const res = await apiFetch('/api/memberships');
    const data = await res.json();
    setMembershipPlans(Array.isArray(data) ? data : []);
  };

  const handleApprove = async () => {
    if (!approveTarget) return;

    const body = selectedPlanId ? { membership_id: Number(selectedPlanId) } : {};
    const res = await apiFetch(`/api/payments/${approveTarget.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'No se pudo aprobar');
      return;
    }

    setApproveTarget(null);
    apiFetchPayments();
  };

  const handleReject = async (id: number) => {
    if (!confirm('¿Rechazar este pago?')) return;

    const res = await apiFetch(`/api/payments/${id}/reject`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'No se pudo rechazar');
      return;
    }
    apiFetchPayments();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
            GESTIÓN DE <span className="text-orange-500">PAGOS</span>
          </h1>
          <p className="text-zinc-500 font-medium">
            {user?.role === 'member'
              ? 'Reporta tu pago y el admin activará tu membresía al aprobarlo'
              : 'Administra y aprueba los reportes de ingresos'}
          </p>
        </div>
        <button 
          onClick={() => user?.role === 'member' && setShowModal(true)}
          className={`flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95 ${user?.role !== 'member' ? 'hidden' : ''}`}
        >
          <Plus className="h-5 w-5" />
          Reportar Pago
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase font-black text-[10px] tracking-widest">
              <tr>
                <th className="px-8 py-5">Usuario</th>
                <th className="px-8 py-5">Monto (USD)</th>
                <th className="px-8 py-5">Método</th>
                <th className="px-8 py-5">Referencia</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                 <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Cargando pagos...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">No hay pagos registrados</td></tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-8 py-5 font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-tight">{payment.user_name}</td>
                  <td className="px-8 py-5 font-black text-zinc-900 dark:text-white italic tracking-tighter">${payment.amount_usd}</td>
                  <td className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">{payment.method.replace('_', ' ')}</td>
                  <td className="px-8 py-5 font-mono text-[10px] font-black tracking-tighter opacity-50">{payment.reference}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ${
                      payment.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' :
                      payment.status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-500' :
                      'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
                    }`}>
                      {payment.status === 'approved' ? 'APROBADO' : 
                       payment.status === 'rejected' ? 'RECHAZADO' : 'PENDIENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user?.role === 'admin' && payment.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openApproveModal(payment)} className="p-1 hover:bg-emerald-500/20 rounded text-emerald-500" title="Aprobar">
                          <Check className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleReject(payment.id)} className="p-1 hover:bg-red-500/20 rounded text-red-500" title="Rechazar">
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase mb-8">REPORTAR <span className="text-orange-500">PAGO</span></h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {user?.role === 'member' && membershipPlans.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    Plan (referencia de monto)
                  </label>
                  <select
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold"
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
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Monto (USD)</label>
                <input 
                  type="number" 
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-black italic tracking-tighter outline-none focus:ring-2 focus:ring-orange-500 transition-all text-2xl"
                  value={amountUsd}
                  onChange={e => setAmountUsd(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Monto (Bs) — tasa {EXCHANGE_RATE}
                </label>
                <input
                  type="number"
                  readOnly
                  className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-600 dark:text-zinc-400 font-bold outline-none"
                  value={amountBs}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Método</label>
                <select
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="pago_movil">Pago móvil</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo_usd">Efectivo USD</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Número de Referencia</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Referencia bancaria"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Comprobante (Captura)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-200 dark:border-zinc-700 border-dashed rounded-3xl cursor-pointer bg-zinc-50 dark:bg-zinc-800/10 hover:bg-orange-500/5 hover:border-orange-500/50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-orange-600 transition-colors">ADJUNTAR COMPROBANTE</p>
                    </div>
                    <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                {file && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mt-2 text-center">Seleccionado: {file.name}</p>}
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold rounded-2xl transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                >
                  ENVIAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {approveTarget && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2 text-zinc-900 dark:text-white">
              Aprobar <span className="text-emerald-500">pago</span>
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              {approveTarget.user_name} — ${approveTarget.amount_usd}
            </p>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
              Plan a asignar (opcional)
            </label>
            <select
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold mb-6"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="">Detectar por monto del pago</option>
              {membershipPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — ${plan.price_usd} / {plan.duration_days} días
                </option>
              ))}
            </select>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold text-zinc-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
