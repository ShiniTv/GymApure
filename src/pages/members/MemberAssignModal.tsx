import { Button, Label, Modal } from '../../components/ui';
import type { Member } from '../../hooks/queries/useMembersQuery';

export interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

export interface ApprovedPaymentOption {
  id: number;
  amount_usd: number;
  method: string;
  created_at: string;
}

interface MemberAssignModalProps {
  target: Member | null;
  onClose: () => void;
  isReceptionist: boolean;
  membershipPlans: MembershipPlan[];
  selectedPlanId: string;
  onSelectedPlanIdChange: (value: string) => void;
  approvedPayments: ApprovedPaymentOption[];
  selectedPaymentId: string;
  onSelectedPaymentIdChange: (value: string) => void;
  assignError: string;
  onClearAssignError: () => void;
  onAssign: () => void;
}

export function MemberAssignModal({
  target,
  onClose,
  isReceptionist,
  membershipPlans,
  selectedPlanId,
  onSelectedPlanIdChange,
  approvedPayments,
  selectedPaymentId,
  onSelectedPaymentIdChange,
  assignError,
  onClearAssignError,
  onAssign,
}: MemberAssignModalProps) {
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      maxWidth="lg"
      title={
        target ? (
          <>
            Membresía — <span className="text-brand">{target.full_name}</span>
          </>
        ) : (
          ''
        )
      }
    >
      {target && (
        <>
          {target.membership_name && (
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
              Plan actual: <strong>{target.membership_name}</strong> ({target.days_remaining} días).
              La nueva suscripción se encadena al vencimiento.
            </p>
          )}
          {isReceptionist && (
            <div className="mb-4">
              <Label>Pago aprobado (obligatorio)</Label>
              <select
                className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold dark:border-zinc-700 dark:bg-zinc-800"
                value={selectedPaymentId}
                onChange={(e) => {
                  onSelectedPaymentIdChange(e.target.value);
                  onClearAssignError();
                }}
              >
                <option value="">Seleccionar pago aprobado…</option>
                {approvedPayments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    ${payment.amount_usd} — {payment.method} —{' '}
                    {new Date(payment.created_at).toLocaleDateString('es-VE')}
                  </option>
                ))}
              </select>
              {approvedPayments.length === 0 && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  No hay pagos aprobados para este miembro. Registre y apruebe un pago primero.
                </p>
              )}
            </div>
          )}
          <select
            className="mb-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold dark:border-zinc-700 dark:bg-zinc-800"
            value={selectedPlanId}
            onChange={(e) => onSelectedPlanIdChange(e.target.value)}
          >
            <option value="">Seleccionar plan...</option>
            {membershipPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.duration_days} días — ${plan.price_usd}
              </option>
            ))}
          </select>
          {assignError && <p className="mb-3 text-xs text-red-500">{assignError}</p>}
          <Button onClick={onAssign} className="w-full">
            Asignar / Renovar
          </Button>
        </>
      )}
    </Modal>
  );
}
