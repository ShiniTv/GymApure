import { Button, Label, Modal, Select } from '../../components/ui';
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
  const canAssign = Boolean(selectedPlanId) && (!isReceptionist || Boolean(selectedPaymentId));

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      maxWidth="md"
      scrollable
      title={
        target ? (
          <>
            Membresía — <span className="text-brand">{target.full_name}</span>
          </>
        ) : (
          ''
        )
      }
      footer={
        target ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={!canAssign}
              onClick={onAssign}
            >
              Asignar
            </Button>
          </>
        ) : null
      }
    >
      {target ? (
        <div className="space-y-2.5">
          {target.membership_name ? (
            <p className="text-text-muted text-small leading-snug">
              Plan actual: <span className="text-text font-medium">{target.membership_name}</span> (
              {target.days_remaining} días). La nueva suscripción se encadena al vencimiento.
            </p>
          ) : null}
          {isReceptionist ? (
            <div>
              <Label className="mb-0.5">Pago aprobado</Label>
              <Select
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
              </Select>
              {approvedPayments.length === 0 ? (
                <p className="text-small mt-1.5 text-amber-600 dark:text-amber-400">
                  No hay pagos aprobados. Registra y aprueba un pago primero.
                </p>
              ) : null}
            </div>
          ) : null}
          <div>
            <Label className="mb-0.5">Plan</Label>
            <Select value={selectedPlanId} onChange={(e) => onSelectedPlanIdChange(e.target.value)}>
              <option value="">Seleccionar plan…</option>
              {membershipPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.duration_days} días — ${plan.price_usd}
                </option>
              ))}
            </Select>
          </div>
          {assignError ? <p className="text-danger text-xs">{assignError}</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}
