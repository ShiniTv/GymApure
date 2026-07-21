import { Button, Label, Modal, Select, Textarea } from '../../components/ui';
import { paymentProofUrl } from '../../lib/api';
import type { Payment } from './helpers';

export interface PaymentPlanOption {
  id: number;
  name: string;
  price_usd: number;
  duration_days: number;
}

interface PaymentActionModalsProps {
  isStaffPayment: boolean;
  approveTarget: Payment | null;
  onCloseApprove: () => void;
  membershipPlans: PaymentPlanOption[];
  selectedPlanId: string;
  onSelectedPlanIdChange: (value: string) => void;
  approving: boolean;
  onApprove: () => void;

  rejectTarget: Payment | null;
  onCloseReject: () => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  actionError: string;
  rejecting: boolean;
  onReject: () => void;

  proofPreview: Payment | null;
  onCloseProof: () => void;
}

export function PaymentActionModals({
  isStaffPayment,
  approveTarget,
  onCloseApprove,
  membershipPlans,
  selectedPlanId,
  onSelectedPlanIdChange,
  approving,
  onApprove,
  rejectTarget,
  onCloseReject,
  rejectReason,
  onRejectReasonChange,
  actionError,
  rejecting,
  onReject,
  proofPreview,
  onCloseProof,
}: PaymentActionModalsProps) {
  return (
    <>
      <Modal
        open={!!approveTarget && isStaffPayment}
        onClose={onCloseApprove}
        maxWidth="lg"
        title={
          <>
            Aprobar <span className="text-emerald-500">pago</span>
          </>
        }
      >
        {approveTarget && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {approveTarget.user_name} — ${approveTarget.amount_usd}
                {approveTarget.reference ? ` · Ref: ${approveTarget.reference}` : ''}
              </p>
              {approveTarget.proof_url ? (
                <a
                  href={paymentProofUrl(approveTarget.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand text-xs font-semibold hover:underline sm:justify-self-end"
                >
                  Ver comprobante
                </a>
              ) : null}
            </div>
            <Label>Plan a asignar</Label>
            <Select
              className="mb-6"
              value={selectedPlanId}
              onChange={(e) => onSelectedPlanIdChange(e.target.value)}
              required
            >
              <option value="">Seleccionar plan…</option>
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
                disabled={approving}
                onClick={onCloseApprove}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-500"
                loading={approving}
                disabled={!selectedPlanId || approving}
                onClick={onApprove}
              >
                Aprobar
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={onCloseReject}
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
            <Label htmlFor="reject-reason">Motivo</Label>
            <Textarea
              id="reject-reason"
              className="mb-4"
              rows={3}
              maxLength={500}
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              placeholder="Ej. Comprobante ilegible o referencia no coincide"
              required
            />
            {actionError && <p className="mb-4 text-sm font-bold text-red-500">{actionError}</p>}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                disabled={rejecting}
                onClick={onCloseReject}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                loading={rejecting}
                disabled={rejectReason.trim().length < 3 || rejecting}
                onClick={onReject}
              >
                Rechazar
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!proofPreview}
        onClose={onCloseProof}
        title="Comprobante de pago"
        maxWidth="2xl"
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
    </>
  );
}
