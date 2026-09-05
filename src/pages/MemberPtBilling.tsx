import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Landmark, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  DataCard,
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
    <div className="page-stack-tight mx-auto w-full max-w-3xl">
      <PageHeader
        compact
        title={
          <>
            Cobros <span className="text-brand">PT</span>
          </>
        }
        subtitle="Sesiones 1:1 · aparte de la membresía"
        action={<BackToDashboardLink iconOnly />}
      />

      {pendingCount > 0 ? (
        <p className="text-text-secondary text-xs">
          {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} · reporta el pago
        </p>
      ) : null}

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          compact
          icon={Landmark}
          title="Nada por pagar"
          description="Cuando tu entrenador te envíe un cobro de sesión 1:1, lo verás aquí. La membresía del gym se gestiona en Pagos."
          action={
            <Link to="/payments">
              <Button size="sm" variant="secondary">
                Ir a Pagos
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <DataCard key={inv.id} className="!space-y-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="text-text min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
                      {inv.title}
                      {inv.trainer_name ? (
                        <span className="text-text-muted font-medium"> · {inv.trainer_name}</span>
                      ) : null}
                    </p>
                    <Badge
                      variant={statusVariant(inv.status)}
                      className="text-small shrink-0 px-1.5 py-0"
                    >
                      {statusLabel(inv.status)}
                    </Badge>
                  </div>
                  <p className="text-text-secondary text-small mt-0.5 truncate leading-snug">
                    <span className="text-brand font-semibold tabular-nums">${inv.amount_usd}</span>
                    {inv.reference ? (
                      <>
                        <span className="text-text-muted mx-1.5">·</span>
                        <span className="text-small font-mono">Ref. {inv.reference}</span>
                      </>
                    ) : null}
                    {inv.rejection_reason ? (
                      <>
                        <span className="text-text-muted mx-1.5">·</span>
                        <span>{inv.rejection_reason}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                {inv.status === 'pending' ? (
                  <Button size="sm" className="shrink-0" onClick={() => openReport(inv)}>
                    {inv.reference ? 'Actualizar' : 'Reportar'}
                  </Button>
                ) : null}
              </div>
            </DataCard>
          ))}
        </div>
      )}

      <Modal
        open={!!reporting}
        onClose={() => setReporting(null)}
        title={<>Reportar pago</>}
        maxWidth="lg"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setReporting(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => void submitReport()}
              disabled={reference.trim().length < 1 || report.isPending}
              loading={report.isPending}
            >
              Enviar
            </Button>
          </>
        }
      >
        {reporting ? (
          <div className="space-y-3.5">
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
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
