import { useMemo, useState } from 'react';
import { Landmark, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Spinner,
  BackToDashboardLink,
} from '../components/ui';
import { PaymentDestinationHint } from '../components/payments/PaymentDestinationHint';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import {
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodKey,
} from '../lib/paymentDestinationsCore';
import {
  useReportTrainerInvoiceMutation,
  useTrainerDestinationsForMemberQuery,
  useTrainerInvoicesQuery,
  useTrainerRateContextForMemberQuery,
  type TrainerInvoice,
} from '../hooks/queries/useTrainerBillingQuery';

function statusLabel(status: string) {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Pendiente';
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'confirmed') return 'success';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  return 'warning';
}

export default function MemberPtBilling() {
  usePageTitle('Cobros PT');
  const toast = useToastOptional();
  const { data: invoices = [], isPending } = useTrainerInvoicesQuery(true);
  const report = useReportTrainerInvoiceMutation();

  const [reporting, setReporting] = useState<TrainerInvoice | null>(null);
  const [method, setMethod] = useState<PaymentMethodKey>('pago_movil');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const trainerId = reporting?.trainer_id ?? null;
  const { data: destinations } = useTrainerDestinationsForMemberQuery(trainerId, !!reporting);
  const { data: rateCtx } = useTrainerRateContextForMemberQuery(trainerId, !!reporting);

  const pendingCount = useMemo(
    () => invoices.filter((i) => i.status === 'pending').length,
    [invoices]
  );

  const openReport = (inv: TrainerInvoice) => {
    setReporting(inv);
    setMethod('pago_movil');
    setReference(inv.reference ?? '');
    setFile(null);
  };

  const submitReport = async () => {
    if (!reporting) return;
    try {
      await report.mutateAsync({
        id: reporting.id,
        method,
        reference: reference.trim(),
        proof: file,
      });
      toast?.success('Pago reportado — tu entrenador lo confirmará');
      setReporting(null);
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err));
    }
  };

  return (
    <div className="page-stack mx-auto w-full max-w-3xl">
      <PageHeader
        compact
        title={
          <>
            Cobros <span className="text-brand">PT</span>
          </>
        }
        subtitle="Pagos de entrenamiento personalizado con tu entrenador. Independiente de la membresía del gym."
        action={<BackToDashboardLink />}
      />

      {pendingCount > 0 ? (
        <p className="text-text-secondary text-xs">
          Tienes {pendingCount} cobro{pendingCount === 1 ? '' : 's'} pendiente
          {pendingCount === 1 ? '' : 's'}.
        </p>
      ) : null}

      <Card padding="sm" rounded="xl" className="md:p-4">
        {isPending ? (
          <Spinner />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Sin cobros PT"
            description="Cuando tu entrenador te cobre una sesión o paquete, aparecerá aquí."
          />
        ) : (
          <ul className="divide-border divide-y">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {inv.title}
                    {inv.trainer_name ? ` · ${inv.trainer_name}` : ''}
                  </p>
                  <p className="text-text-secondary text-xs">
                    ${inv.amount_usd}
                    {inv.reference ? ` · Ref. ${inv.reference}` : ''}
                    {inv.rejection_reason ? ` · ${inv.rejection_reason}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                  {inv.status === 'pending' ? (
                    <Button size="sm" onClick={() => openReport(inv)}>
                      {inv.reference ? 'Actualizar reporte' : 'Reportar pago'}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!reporting}
        onClose={() => setReporting(null)}
        title={
          <>
            REPORTAR <span className="text-brand">PAGO PT</span>
          </>
        }
        maxWidth="lg"
        scrollable
      >
        {reporting ? (
          <div className="page-stack">
            <p className="text-text-secondary text-sm">
              {reporting.title} —{' '}
              <span className="text-text font-semibold">${reporting.amount_usd}</span>
              {reporting.trainer_name ? ` · ${reporting.trainer_name}` : ''}
            </p>
            {rateCtx?.active_bs_per_usd ? (
              <p className="text-text-muted text-xs">
                ≈{' '}
                {(reporting.amount_usd * rateCtx.active_bs_per_usd).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                Bs ({rateCtx.active_label}
                {rateCtx.euro_rate_note ? ` · ${rateCtx.euro_rate_note}` : ''})
              </p>
            ) : null}
            <div>
              <Label>Método</Label>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethodKey)}
              >
                {PAYMENT_METHOD_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
            <PaymentDestinationHint
              method={method}
              destinations={destinations}
              emptyMessage={`Tu entrenador aún no publicó datos de cobro para ${PAYMENT_METHOD_LABELS[method]}.`}
            />
            <div>
              <Label>Referencia / nota</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Nº de referencia o detalle"
                required
              />
            </div>
            <div>
              <Label>Comprobante (opcional)</Label>
              <label className="border-border hover:border-brand/40 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm">
                <Upload className="text-brand h-4 w-4 shrink-0" />
                <span className="text-text-secondary truncate">
                  {file ? file.name : 'Subir imagen o PDF'}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void submitReport()}
                disabled={reference.trim().length < 1 || report.isPending}
                loading={report.isPending}
              >
                Enviar reporte
              </Button>
              <Button variant="ghost" onClick={() => setReporting(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
