import type { FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button, Input, Label, Modal, Select, Spinner } from '../../components/ui';
import { formatBsRateLabel, type ExchangeRate } from '../../hooks/queries/useExchangeRateQuery';

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
  return (
    <Modal
      open={open}
      onClose={onClose}
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
      maxWidth="2xl"
      scrollable
    >
      <form onSubmit={onSubmit} className="page-stack">
        {submitError && (
          <p className="text-sm font-bold text-red-500" role="alert">
            {submitError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4">
          {isStaffPayment && !isMember && (
            <div className="sm:col-span-2">
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
          {(isMember || isStaffPayment) && membershipPlans.length > 0 && (
            <div className="sm:col-span-2">
              <Label>Plan (referencia de monto)</Label>
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
          <div>
            <Label>Monto (USD)</Label>
            <Input
              type="number"
              required
              className="text-xl font-semibold"
              value={amountUsd}
              error={fieldErrors.amount}
              onChange={(e) => {
                onAmountUsdChange(e.target.value);
                if (fieldErrors.amount) onClearFieldError('amount');
              }}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Método</Label>
            <Select value={method} onChange={(e) => onMethodChange(e.target.value)}>
              <option value="pago_movil">Pago móvil</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo_usd">Efectivo USD</option>
            </Select>
          </div>
          {needsBsRate && (
            <div className="sm:col-span-2">
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
                    {fieldErrors.exchange || 'No se pudo cargar la tasa de cambio oficial.'}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={onRefetchExchangeRate}>
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
          <div className="sm:col-span-2">
            <Label>Número de Referencia</Label>
            <Input
              type="text"
              required
              value={reference}
              error={fieldErrors.reference}
              onChange={(e) => {
                onReferenceChange(e.target.value);
                if (fieldErrors.reference) onClearFieldError('reference');
              }}
              placeholder="Referencia bancaria"
            />
          </div>
          <div className="sm:col-span-2">
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
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {file && (
              <p className="mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-500">
                Seleccionado: {file.name}
              </p>
            )}
            {!file ? (
              <p className="mt-2 rounded-lg border border-amber-300/70 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Sin comprobante: la revisión puede tardar más o rechazarse.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            size="lg"
            disabled={submitting}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1"
            size="lg"
            loading={submitting}
            disabled={needsBsRate && (exchangeRateLoading || !exchangeRate)}
          >
            Enviar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
