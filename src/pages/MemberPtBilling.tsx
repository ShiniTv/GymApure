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
  ModalActions,
  Select,
  Skeleton,
  BackToDashboardLink,
} from '../components/ui';
import {
  OperateHeader,
  OperatePage,
  OperateMetricStrip,
} from '../components/operate/OperateChrome';
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

  const stats = useMemo(() => {
    const pending = invoices.filter((i) => i.status === 'pending').length;
    const confirmed = invoices.filter((i) => i.status === 'confirmed').length;
    const total = invoices.reduce((acc, i) => acc + (Number(i.amount_usd) || 0), 0);
    return { pending, confirmed, total };
  }, [invoices]);

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
    <OperatePage maxWidth="max-w-3xl">
      <OperateHeader
        icon={Landmark}
        title={
          <>
            Cobros <span className="text-brand">PT</span>
          </>
        }
        subtitle="Sesiones 1:1 · aparte de la membresía"
        action={<BackToDashboardLink iconOnly />}
      />

      {invoices.length > 0 && (
        <OperateMetricStrip
          items={[
            { label: 'Pendientes', value: stats.pending },
            { label: 'Confirmados', value: stats.confirmed },
            { label: 'Total', value: `$${stats.total.toFixed(0)}` },
          ]}
        />
      )}

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando facturas de asesoría">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
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
        <div className="space-y-2.5">
          {invoices.map((inv) => (
            <DataCard key={inv.id} className="p-3.5 sm:p-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-text truncate text-sm font-semibold">{inv.title}</p>
                    {inv.trainer_name ? (
                      <span className="text-text-muted text-xs font-normal">
                        {' '}
                        · {inv.trainer_name}
                      </span>
                    ) : null}
                    <Badge
                      variant={statusVariant(inv.status)}
                      className="text-small shrink-0 px-2 py-0.5"
                    >
                      {statusLabel(inv.status)}
                    </Badge>
                  </div>
                  <div className="text-small text-text-secondary flex flex-wrap items-center gap-2">
                    <span className="text-brand text-base font-semibold tabular-nums">
                      ${inv.amount_usd}
                    </span>
                    {inv.reference ? (
                      <>
                        <span className="text-text-muted">·</span>
                        <span className="text-text-muted font-mono text-xs">
                          Ref. {inv.reference}
                        </span>
                      </>
                    ) : null}
                    {inv.rejection_reason ? (
                      <>
                        <span className="text-text-muted">·</span>
                        <span className="text-danger">{inv.rejection_reason}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                {inv.status === 'pending' ? (
                  <Button
                    size="sm"
                    className="shrink-0 self-start sm:self-auto"
                    onClick={() => openReport(inv)}
                  >
                    {inv.reference ? 'Actualizar pago' : 'Reportar pago'}
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
        title="Reportar pago"
        maxWidth="lg"
        scrollable
        footer={
          <ModalActions>
            <Button type="button" variant="secondary" size="sm" onClick={() => setReporting(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void submitReport()}
              disabled={reference.trim().length < 1 || report.isPending}
              loading={report.isPending}
            >
              Enviar reporte
            </Button>
          </ModalActions>
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
              <label className="border-border/60 hover:border-brand/50 hover:bg-surface-raised/40 bg-surface-raised/20 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed px-3 py-4 text-center transition-all duration-150">
                <div className="bg-brand/10 text-brand flex h-9 w-9 items-center justify-center rounded-full">
                  <Upload className="h-4 w-4" />
                </div>
                <span className="text-text-secondary text-sm font-medium">
                  {file ? file.name : 'Subir captura o comprobante (PDF o imagen)'}
                </span>
                <span className="text-text-muted text-xs">
                  {file
                    ? `${(file.size / 1024).toFixed(0)} KB · clic para cambiar`
                    : 'PNG, JPG, PDF hasta 10MB'}
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
    </OperatePage>
  );
}
