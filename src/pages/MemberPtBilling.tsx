import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Clock, Landmark, Upload, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Label,
  Modal,
  ModalActions,
  Select,
  Skeleton,
  BackToDashboardLink,
  Card,
} from '../components/ui';
import {
  OperateHeader,
  OperatePage,
  OperateMetricStrip,
  OperateIcon,
} from '../components/operate/OperateChrome';
import { PaymentDestinationHint } from '../components/payments/PaymentDestinationHint';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import { cn } from '../lib/utils';
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

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethodKey>('pago_movil');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Auto select first invoice
  useEffect(() => {
    if (invoices.length > 0 && selectedInvoiceId === null) {
      // Prioritize pending invoice
      const firstPending = invoices.find((i) => i.status === 'pending');
      setSelectedInvoiceId(firstPending ? firstPending.id : invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  const activeInvoice = useMemo(
    () => invoices.find((i) => i.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  );

  const trainerId = activeInvoice?.trainer_id ?? null;
  const { data: destinations } = useTrainerDestinationsForMemberQuery(trainerId, !!activeInvoice);
  const { data: rateCtx } = useTrainerRateContextForMemberQuery(trainerId, !!activeInvoice);

  const stats = useMemo(() => {
    const pending = invoices.filter((i) => i.status === 'pending').length;
    const confirmed = invoices.filter((i) => i.status === 'confirmed').length;
    const total = invoices.reduce((acc, i) => acc + (Number(i.amount_usd) || 0), 0);
    return { pending, confirmed, total };
  }, [invoices]);

  const handleSelectInvoice = (inv: TrainerInvoice) => {
    setSelectedInvoiceId(inv.id);
    setMethod('pago_movil');
    setReference(inv.reference ?? '');
    setFile(null);
    if (window.innerWidth < 1024) {
      setModalOpen(true);
    }
  };

  const submitReport = async () => {
    if (!activeInvoice) return;
    try {
      await report.mutateAsync({
        id: activeInvoice.id,
        method,
        reference: reference.trim(),
        proof: file,
      });
      toast?.success('Pago reportado — tu entrenador lo confirmará');
      setModalOpen(false);
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err));
    }
  };

  return (
    <OperatePage maxWidth="max-w-7xl">
      <OperateHeader
        icon={Landmark}
        title={
          <>
            Cobros <span className="text-brand">PT</span>
          </>
        }
        subtitle="Sesiones 1:1 y planes de asesoría personalizada con tu entrenador"
        action={<BackToDashboardLink iconOnly />}
      />

      {invoices.length > 0 && (
        <OperateMetricStrip
          items={[
            {
              label: 'Pendientes',
              value: stats.pending,
              subtext: stats.pending > 0 ? 'Por pagar' : 'Todo al día',
              icon: Clock,
            },
            {
              label: 'Confirmados',
              value: stats.confirmed,
              subtext: 'Sesiones pagadas',
              icon: CheckCircle2,
            },
            {
              label: 'Total Asesorías',
              value: `$${stats.total.toFixed(0)}`,
              subtext: `${invoices.length} cobro(s)`,
              icon: Landmark,
            },
          ]}
        />
      )}

      {isPending ? (
        <div className="space-y-2.5" aria-busy="true" aria-label="Cargando facturas de asesoría">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
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
                Ir a Pagos del Gym
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(23rem,27rem)] lg:items-start">
          {/* LEFT: Invoices List */}
          <div className="space-y-2.5">
            <h3 className="text-text-muted px-1 text-xs font-bold tracking-wider uppercase">
              Mis Cobros de Entrenamiento ({invoices.length})
            </h3>
            {invoices.map((inv) => {
              const isSelected = selectedInvoiceId === inv.id;

              return (
                <div
                  key={inv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectInvoice(inv)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectInvoice(inv);
                  }}
                  className={cn(
                    'border-border/70 bg-surface/90 hover:border-brand/40 hover:bg-surface-raised/60 group relative flex cursor-pointer items-center justify-between gap-3.5 rounded-xl border p-4 transition-all duration-150',
                    isSelected &&
                      'border-brand/70 ring-brand/30 bg-surface-raised/90 shadow-brand/5 shadow-md ring-2'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <OperateIcon
                      icon={
                        inv.status === 'confirmed'
                          ? CheckCircle2
                          : inv.status === 'rejected' || inv.status === 'cancelled'
                            ? XCircle
                            : Clock
                      }
                      tone={
                        inv.status === 'confirmed'
                          ? 'success'
                          : inv.status === 'rejected' || inv.status === 'cancelled'
                            ? 'danger'
                            : 'warn'
                      }
                      well
                      size="md"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'truncate text-sm font-semibold tracking-[-0.011em]',
                            isSelected ? 'text-brand' : 'text-text'
                          )}
                        >
                          {inv.title}
                        </p>
                        {inv.trainer_name ? (
                          <span className="text-text-muted text-xs font-normal">
                            · {inv.trainer_name}
                          </span>
                        ) : null}
                        <Badge
                          variant={statusVariant(inv.status)}
                          className="shrink-0 px-1.5 py-0 text-[10px]"
                        >
                          {statusLabel(inv.status)}
                        </Badge>
                      </div>

                      <div className="text-text-secondary flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-brand font-bold tabular-nums">
                          ${inv.amount_usd} USD
                        </span>
                        {inv.reference ? (
                          <>
                            <span className="text-text-muted">·</span>
                            <span className="text-text-muted font-mono text-[11px]">
                              Ref. {inv.reference}
                            </span>
                          </>
                        ) : null}
                        {inv.rejection_reason ? (
                          <>
                            <span className="text-text-muted">·</span>
                            <span className="text-danger text-[11px] font-medium">
                              {inv.rejection_reason}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {inv.status === 'pending' ? (
                    <Button
                      size="sm"
                      className="shrink-0 gap-1 text-xs shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectInvoice(inv);
                      }}
                    >
                      {inv.reference ? 'Actualizar Pago' : 'Reportar Pago'}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* RIGHT: Sticky Reporting Dossier on Desktop */}
          <div className="hidden lg:sticky lg:top-20 lg:block">
            <Card
              padding="md"
              rounded="2xl"
              className="border-border/80 bg-surface/95 shadow-xl backdrop-blur-md"
            >
              {activeInvoice ? (
                <div className="space-y-4">
                  <div className="border-border/60 bg-surface-raised/40 rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-text text-base font-bold tracking-tight">
                          {activeInvoice.title}
                        </h4>
                        <p className="text-text-muted mt-0.5 text-xs">
                          Entrenador: {activeInvoice.trainer_name || 'Personal Trainer'}
                        </p>
                      </div>
                      <Badge
                        variant={statusVariant(activeInvoice.status)}
                        className="px-2 py-0.5 text-xs"
                      >
                        {statusLabel(activeInvoice.status)}
                      </Badge>
                    </div>

                    <div className="border-border/50 mt-3 flex items-baseline justify-between border-t pt-2.5">
                      <span className="text-text-muted text-xs font-medium uppercase">
                        Monto a Pagar
                      </span>
                      <div className="text-right">
                        <span className="text-brand text-2xl font-black tabular-nums">
                          ${activeInvoice.amount_usd}{' '}
                          <span className="text-text-muted text-xs font-bold">USD</span>
                        </span>
                        {rateCtx?.active_bs_per_usd ? (
                          <p className="text-text-secondary mt-0.5 text-xs">
                            ≈{' '}
                            {(activeInvoice.amount_usd * rateCtx.active_bs_per_usd).toLocaleString(
                              'es-VE',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}{' '}
                            Bs ({rateCtx.active_label})
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {activeInvoice.status === 'pending' ? (
                    <div className="space-y-3.5 pt-1">
                      <div>
                        <Label className="text-xs">Método de Pago</Label>
                        <Select
                          value={method}
                          onChange={(e) => setMethod(e.target.value as PaymentMethodKey)}
                          className="text-xs"
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
                        <Label className="text-xs">Nº de Referencia o Comprobante</Label>
                        <Input
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="Ej. 12345678"
                          className="font-mono text-xs"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Adjuntar Comprobante (opcional)</Label>
                        <label className="border-border/60 hover:border-brand/50 hover:bg-surface-raised/40 bg-surface-raised/20 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-3.5 text-center transition-all">
                          <Upload className="text-brand h-5 w-5" />
                          <span className="text-text-secondary text-xs font-medium">
                            {file ? file.name : 'Seleccionar imagen o PDF'}
                          </span>
                          <span className="text-text-muted text-[10px]">
                            {file ? `${(file.size / 1024).toFixed(0)} KB` : 'PNG, JPG, PDF'}
                          </span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      </div>

                      <Button
                        type="button"
                        size="md"
                        className="shadow-brand/20 w-full text-xs font-semibold shadow-md"
                        onClick={() => void submitReport()}
                        disabled={reference.trim().length < 1 || report.isPending}
                        loading={report.isPending}
                      >
                        Enviar Reporte de Pago
                      </Button>
                    </div>
                  ) : (
                    <div className="border-success/30 bg-success/10 text-success flex items-center justify-center gap-2 rounded-xl p-4 text-center text-xs font-semibold">
                      <CheckCircle2 className="h-5 w-5" />
                      Este cobro ya está completado y confirmado por tu entrenador.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-text-muted py-8 text-center text-xs">
                  Selecciona un cobro para ver sus datos
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* MOBILE MODAL */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Reportar Pago"
        maxWidth="lg"
        scrollable
        footer={
          <ModalActions>
            <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void submitReport()}
              disabled={reference.trim().length < 1 || report.isPending}
              loading={report.isPending}
            >
              Enviar Reporte
            </Button>
          </ModalActions>
        }
      >
        {activeInvoice ? (
          <div className="space-y-3.5">
            <p className="text-text-secondary text-sm">
              {activeInvoice.title} —{' '}
              <span className="text-text font-semibold">${activeInvoice.amount_usd} USD</span>
              {activeInvoice.trainer_name ? ` · ${activeInvoice.trainer_name}` : ''}
            </p>
            {rateCtx?.active_bs_per_usd ? (
              <p className="text-text-muted text-xs">
                ≈{' '}
                {(activeInvoice.amount_usd * rateCtx.active_bs_per_usd).toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                Bs ({rateCtx.active_label}
                {rateCtx.euro_rate_note ? ` · ${rateCtx.euro_rate_note}` : ''})
              </p>
            ) : null}
            <div>
              <Label>Método de Pago</Label>
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
              <Label>Referencia / Nota</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Nº de referencia o detalle"
                required
              />
            </div>
            <div>
              <Label>Comprobante (opcional)</Label>
              <label className="border-border/60 hover:border-brand/50 hover:bg-surface-raised/40 bg-surface-raised/20 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-4 text-center transition-all">
                <Upload className="text-brand h-5 w-5" />
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
