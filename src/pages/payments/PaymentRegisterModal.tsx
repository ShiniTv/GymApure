import { useEffect, useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button, Input, Label, Modal, Select, Spinner } from '../../components/ui';
import { formatBsRateLabel, type ExchangeRate } from '../../hooks/queries/useExchangeRateQuery';
import { usePaymentDestinationsQuery } from '../../hooks/queries/usePaymentDestinationsQuery';
import { PaymentDestinationHint } from '../../components/payments/PaymentDestinationHint';
import {
  formatDenominationBreakdown,
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_LABELS,
} from '../../lib/paymentDestinationsCore';

export interface PaymentMemberOption {
  id: number;
  full_name: string;
  cedula: string | null;
}

export interface PaymentPlanOption {
  id: number;
  name: string;
  price_usd: number;
  duration_days?: number;
}

interface PaymentRegisterModalProps {
  open: boolean;
  onClose: () => void;
  isStaffPayment: boolean;
  isMember: boolean;
  onSubmit: (e: FormEvent) => void;
  submitError: string;
  fieldErrors: Record<string, string>;
  onClearFieldError: (key: string) => void;
  loadingMembers: boolean;
  memberOptions: PaymentMemberOption[];
  selectedMemberId: string;
  onSelectedMemberIdChange: (value: string) => void;
  membershipPlans: PaymentPlanOption[];
  selectedPlanId: string;
  onPlanSelect: (planId: string) => void;
  amountUsd: string;
  onAmountUsdChange: (value: string) => void;
  method: string;
  onMethodChange: (value: string) => void;
  needsBsRate: boolean;
  exchangeRate: ExchangeRate | null | undefined;
  exchangeRateLoading: boolean;
  exchangeRateError: boolean;
  amountBs: string;
  onRefetchExchangeRate: () => void;
  reference: string;
  onReferenceChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  submitting: boolean;
}

type WizardStep = 1 | 2 | 3;

export function PaymentRegisterModal({
  open,
  onClose,
  isStaffPayment,
  isMember,
  onSubmit,
  submitError,
  fieldErrors,
  onClearFieldError,
  loadingMembers,
  memberOptions,
  selectedMemberId,
  onSelectedMemberIdChange,
  membershipPlans,
  selectedPlanId,
  onPlanSelect,
  amountUsd,
  onAmountUsdChange,
  method,
  onMethodChange,
  needsBsRate,
  exchangeRate,
  exchangeRateLoading,
  exchangeRateError,
  amountBs,
  onRefetchExchangeRate,
  reference,
  onReferenceChange,
  file,
  onFileChange,
  submitting,
}: PaymentRegisterModalProps) {
  const { data: destinations } = usePaymentDestinationsQuery(open);
  const [billCounts, setBillCounts] = useState<Record<number, number>>({});
  const [step, setStep] = useState<WizardStep>(1);
  const isCashUsd = method === 'efectivo_usd';
  const cashDenoms = destinations?.efectivo_usd.denominations ?? [1, 5, 10, 20, 50, 100];
  const useWizard = isMember || !isStaffPayment;

  useEffect(() => {
    if (!open) {
      setBillCounts({});
      setStep(1);
    }
  }, [open]);

  useEffect(() => {
    if (!isCashUsd) return;
    const { total, label } = formatDenominationBreakdown(billCounts);
    if (total > 0) {
      onAmountUsdChange(String(total));
      if (label) onReferenceChange(`Efectivo USD: ${label}`);
    }
  }, [billCounts, isCashUsd, onAmountUsdChange, onReferenceChange]);

  const canAdvanceFromPlan = Boolean(selectedPlanId || amountUsd);
  const canAdvanceFromMethod = Boolean(method && amountUsd);

  const footer = useWizard ? (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="flex-1"
        disabled={submitting}
        onClick={() => {
          if (step === 1) onClose();
          else setStep((s) => (s === 3 ? 2 : 1));
        }}
      >
        {step === 1 ? 'Cancelar' : 'Atrás'}
      </Button>
      {step < 3 ? (
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={step === 1 ? !canAdvanceFromPlan : !canAdvanceFromMethod}
          onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
        >
          Continuar
        </Button>
      ) : (
        <Button
          type="submit"
          form="payment-register-form"
          size="sm"
          className="flex-1"
          loading={submitting}
          disabled={needsBsRate && (exchangeRateLoading || !exchangeRate)}
        >
          Enviar
        </Button>
      )}
    </>
  ) : (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="flex-1"
        disabled={submitting}
        onClick={onClose}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="payment-register-form"
        size="sm"
        className="flex-1"
        loading={submitting}
        disabled={needsBsRate && (exchangeRateLoading || !exchangeRate)}
      >
        Enviar
      </Button>
    </>
  );

  const showPlan = !useWizard || step === 1;
  const showMethod = !useWizard || step === 2;
  const showProof = !useWizard || step === 3;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isStaffPayment && !isMember ? (
          <>
            Registrar <span className="text-brand">pago</span>
          </>
        ) : (
          <>
            Reportar <span className="text-brand">pago</span>
          </>
        )
      }
      maxWidth="3xl"
      scrollable
      footer={footer}
    >
      <form id="payment-register-form" onSubmit={onSubmit} className="space-y-2.5">
        {useWizard ? (
          <p className="text-text-muted text-xs font-medium">
            Paso {step} de 3 · {step === 1 ? 'Plan' : step === 2 ? 'Método' : 'Comprobante'}
          </p>
        ) : null}
        {submitError && (
          <p className="text-danger text-sm font-bold" role="alert">
            {submitError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
          {isStaffPayment && !isMember && (
            <div className="sm:col-span-2">
              <Label>Miembro</Label>
              {loadingMembers ? (
                <div className="text-text-muted flex items-center gap-2 py-2 text-sm">
                  <Spinner className="h-4 w-4" />
                  Cargando miembros…
                </div>
              ) : (
                <Select
                  required
                  value={selectedMemberId}
                  error={fieldErrors.member}
                  onChange={(e) => {
                    onSelectedMemberIdChange(e.target.value);
                    if (fieldErrors.member) onClearFieldError('member');
                  }}
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
          {showPlan && (isMember || isStaffPayment) && membershipPlans.length > 0 && (
            <div className="sm:col-span-2">
              <Label>Plan</Label>
              <Select value={selectedPlanId} onChange={(e) => onPlanSelect(e.target.value)}>
                <option value="">Seleccionar plan...</option>
                {membershipPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — ${plan.price_usd}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {showPlan && !useWizard ? (
            <div>
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                required
                className="text-xl font-semibold"
                value={amountUsd}
                error={fieldErrors.amount}
                readOnly={isCashUsd && Object.values(billCounts).some((n) => n > 0)}
                onChange={(e) => {
                  onAmountUsdChange(e.target.value);
                  if (fieldErrors.amount) onClearFieldError('amount');
                }}
                placeholder="0.00"
              />
            </div>
          ) : null}
          {showMethod ? (
            <>
              <div>
                <Label>Monto (USD)</Label>
                <Input
                  type="number"
                  required={step === 2 || !useWizard}
                  className="text-xl font-semibold"
                  value={amountUsd}
                  error={fieldErrors.amount}
                  readOnly={isCashUsd && Object.values(billCounts).some((n) => n > 0)}
                  onChange={(e) => {
                    onAmountUsdChange(e.target.value);
                    if (fieldErrors.amount) onClearFieldError('amount');
                  }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Método</Label>
                <Select
                  value={method}
                  onChange={(e) => {
                    onMethodChange(e.target.value);
                    setBillCounts({});
                  }}
                >
                  {PAYMENT_METHOD_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {PAYMENT_METHOD_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </div>
              <PaymentDestinationHint method={method} destinations={destinations} />
              {isCashUsd && destinations?.efectivo_usd.enabled ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Billetes (cantidad por denominación)</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {cashDenoms.map((denom) => (
                      <div key={denom} className="flex items-center gap-2">
                        <span className="text-text-secondary w-10 text-xs font-semibold">
                          ${denom}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="h-9"
                          value={billCounts[denom] ?? 0}
                          onChange={(e) => {
                            const qty = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setBillCounts((prev) => ({ ...prev, [denom]: qty }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {needsBsRate && (
                <div className="sm:col-span-2">
                  <Label>
                    Monto (Bs)
                    {exchangeRate ? ` — Tasa ${formatBsRateLabel(exchangeRate)}` : ' — Tasa BCV'}
                  </Label>
                  {exchangeRateLoading ? (
                    <div className="text-text-muted flex items-center gap-2 py-2 text-sm">
                      <Spinner className="h-4 w-4" />
                      Cargando tasa del día…
                    </div>
                  ) : exchangeRateError || !exchangeRate ? (
                    <div className="space-y-2">
                      <p className="text-danger text-sm font-medium">
                        {fieldErrors.exchange || 'No se pudo cargar la tasa de cambio oficial.'}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onRefetchExchangeRate}
                      >
                        Reintentar
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      readOnly
                      className="bg-surface-raised text-text-secondary"
                      value={amountBs}
                    />
                  )}
                </div>
              )}
            </>
          ) : null}
          {showProof ? (
            <>
              <div className="sm:col-span-2">
                <Label>{isCashUsd ? 'Detalle / referencia' : 'Número de Referencia'}</Label>
                <Input
                  type="text"
                  required={step === 3 || !useWizard}
                  value={reference}
                  error={fieldErrors.reference}
                  onChange={(e) => {
                    onReferenceChange(e.target.value);
                    if (fieldErrors.reference) onClearFieldError('reference');
                  }}
                  placeholder={isCashUsd ? 'Efectivo USD o nota de entrega' : 'Referencia bancaria'}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Comprobante (Captura)</Label>
                <div className="flex w-full items-center justify-center">
                  <label className="border-border bg-surface-raised can-hover:hover:border-brand/50 can-hover:hover:bg-brand/5 group flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-[background-color,border-color,opacity] duration-150 [transition-timing-function:var(--ease-out)]">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="text-text-muted can-hover:group-hover:text-brand mb-3 h-8 w-8 transition-colors" />
                      <p className="text-text-muted can-hover:group-hover:text-brand text-xs font-medium transition-colors">
                        Adjuntar comprobante
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                {file && (
                  <p className="text-success mt-2 text-center text-xs font-medium">
                    Seleccionado: {file.name}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
