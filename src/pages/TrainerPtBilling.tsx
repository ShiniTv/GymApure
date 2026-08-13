import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronDown, Landmark, Plus, Save, Settings2, X } from 'lucide-react';
import {
  Badge,
  Button,
  BackToDashboardLink,
  DataCard,
  EmptyState,
  FilterChips,
  IconButton,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import { cn } from '../lib/utils';
import {
  defaultPaymentDestinations,
  DEFAULT_USD_DENOMINATIONS,
  PAYMENT_METHOD_LABELS,
  type PaymentDestinations,
} from '../lib/paymentDestinationsCore';
import {
  useCancelTrainerInvoiceMutation,
  useConfirmTrainerInvoiceMutation,
  useCreateTrainerInvoiceMutation,
  useCreateTrainerOfferMutation,
  useRejectTrainerInvoiceMutation,
  useTrainerBillingMembersQuery,
  useTrainerDestinationsQuery,
  useTrainerInvoicesQuery,
  useTrainerOffersQuery,
  useTrainerRateContextQuery,
  useUpdateTrainerDestinationsMutation,
  useUpdateTrainerRatePreferenceMutation,
  type TrainerInvoice,
} from '../hooks/queries/useTrainerBillingQuery';

const SURFACE = 'border-border/80 bg-surface rounded-[var(--radius-card)] border';

type InvoiceFilter = 'all' | 'awaiting' | 'confirm' | 'done';

function hasEnabledDestination(dest: PaymentDestinations): boolean {
  return (
    dest.pago_movil.enabled ||
    dest.transferencia.enabled ||
    dest.zelle.enabled ||
    dest.usdt.enabled ||
    dest.efectivo_usd.enabled
  );
}

function statusLabel(status: string, hasReport?: boolean) {
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'cancelled') return 'Cancelado';
  return hasReport ? 'Por confirmar' : 'Esperando';
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  if (status === 'confirmed') return 'success';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  return 'warning';
}

function matchesFilter(inv: TrainerInvoice, filter: InvoiceFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'awaiting') return inv.status === 'pending' && !inv.reference;
  if (filter === 'confirm') return inv.status === 'pending' && Boolean(inv.reference);
  return inv.status === 'confirmed' || inv.status === 'rejected' || inv.status === 'cancelled';
}

export default function TrainerPtBilling() {
  usePageTitle('Cobros PT');
  const toast = useToastOptional();
  const { data: members = [], isPending: loadingMembers } = useTrainerBillingMembersQuery(true);
  const { data: offers = [], isPending: loadingOffers } = useTrainerOffersQuery(true);
  const { data: invoices = [], isPending: loadingInvoices } = useTrainerInvoicesQuery(true);
  const { data: destinations } = useTrainerDestinationsQuery(true);
  const { data: rateCtx } = useTrainerRateContextQuery(true);
  const createInvoice = useCreateTrainerInvoiceMutation();
  const createOffer = useCreateTrainerOfferMutation();
  const updateDest = useUpdateTrainerDestinationsMutation();
  const updateRate = useUpdateTrainerRatePreferenceMutation();
  const confirmInv = useConfirmTrainerInvoiceMutation();
  const rejectInv = useRejectTrainerInvoiceMutation();
  const cancelInv = useCancelTrainerInvoiceMutation();

  const [memberId, setMemberId] = useState('');
  const [title, setTitle] = useState('Sesión personalizada');
  const [amount, setAmount] = useState('');
  const [offerId, setOfferId] = useState('');
  const [offerTitle, setOfferTitle] = useState('Sesión 1:1');
  const [offerPrice, setOfferPrice] = useState('');
  const [destForm, setDestForm] = useState<PaymentDestinations>(defaultPaymentDestinations());
  const [ratePref, setRatePref] = useState<'bcv' | 'euro'>('bcv');
  const [euroRate, setEuroRate] = useState('');
  const [euroNote, setEuroNote] = useState('');
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [destOpen, setDestOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [destWizardOpen, setDestWizardOpen] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');

  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'pending');
  const awaitingPay = pendingInvoices.filter((invoice) => !invoice.reference);
  const awaitingConfirm = pendingInvoices.filter((invoice) => Boolean(invoice.reference));
  const activeOffers = offers.filter((offer) => offer.active);
  const destReady = hasEnabledDestination(destForm);
  const doneCount = invoices.filter((inv) => matchesFilter(inv, 'done')).length;

  const filteredInvoices = useMemo(
    () => invoices.filter((inv) => matchesFilter(inv, invoiceFilter)),
    [invoices, invoiceFilter]
  );

  useEffect(() => {
    if (destinations) setDestForm(destinations);
  }, [destinations]);

  useEffect(() => {
    if (!destinations) return;
    if (hasEnabledDestination(destinations)) return;
    try {
      if (sessionStorage.getItem('gymapure_pt_dest_wizard') === '1') return;
    } catch {
      /* ignore */
    }
    setDestWizardOpen(true);
  }, [destinations]);

  useEffect(() => {
    if (!rateCtx) return;
    setRatePref(rateCtx.rate_preference);
    setEuroRate(rateCtx.euro_rate != null ? String(rateCtx.euro_rate) : '');
    setEuroNote(rateCtx.euro_rate_note);
  }, [rateCtx]);

  const onCreateInvoice = async () => {
    try {
      await createInvoice.mutateAsync({
        member_id: Number(memberId),
        title: title.trim() || 'Cobro PT',
        amount_usd: Number(amount),
        offer_id: offerId ? Number(offerId) : null,
      });
      toast?.success('Cobro enviado al cliente');
      setAmount('');
      setChargeOpen(false);
      setInvoiceFilter('awaiting');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err));
    }
  };

  const onCreateOffer = async () => {
    try {
      await createOffer.mutateAsync({
        title: offerTitle.trim(),
        price_usd: Number(offerPrice),
        billing_unit: 'session',
      });
      toast?.success('Tarifa guardada');
      setOfferPrice('');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err));
    }
  };

  const onSaveDest = () => {
    void updateDest.mutateAsync(destForm).then(
      () => toast?.success('Datos de cobro PT guardados'),
      (err) => toast?.error(toDisplayErrorMessage(err))
    );
  };

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        title={
          <>
            Cobros <span className="text-brand">PT</span>
          </>
        }
        subtitle="Sesiones 1:1 · aparte de la membresía"
        action={
          <div className="flex items-center gap-2">
            <BackToDashboardLink iconOnly />
            <Button size="sm" onClick={() => setChargeOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>
        }
      />

      {!destReady ? (
        <button
          type="button"
          onClick={() => {
            setConfigOpen(true);
            setDestOpen(true);
          }}
          className="border-warning/25 bg-warning/5 text-warning text-small w-full rounded-[var(--radius-button)] border px-3 py-2 text-left leading-snug"
        >
          Configura tus datos de cobro para que el cliente sepa a dónde transferir.
        </button>
      ) : null}

      <FilterChips
        options={[
          { value: 'all', label: 'Todos', count: invoices.length },
          { value: 'awaiting', label: 'Esperando', count: awaitingPay.length },
          { value: 'confirm', label: 'Por confirmar', count: awaitingConfirm.length },
          { value: 'done', label: 'Cerrados', count: doneCount },
        ]}
        value={invoiceFilter}
        onChange={(v) => setInvoiceFilter(v as InvoiceFilter)}
      />

      {loadingInvoices ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          compact
          icon={Landmark}
          title="Sin cobros aún"
          description={
            members.length === 0
              ? 'Asigna miembros o crea una rutina; luego envía el primer cobro.'
              : 'Pulsa Nuevo para enviar un cobro al cliente.'
          }
          action={
            members.length === 0 ? (
              <Link to="/members">
                <Button size="sm" variant="secondary">
                  Ver mis miembros
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => setChargeOpen(true)}>
                <Plus className="h-4 w-4" />
                Nuevo cobro
              </Button>
            )
          }
        />
      ) : filteredInvoices.length === 0 ? (
        <p className="text-text-muted py-6 text-center text-sm">No hay cobros en este filtro.</p>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((inv) => (
            <DataCard key={inv.id} className="!space-y-0 !p-2.5 sm:!p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="text-text min-w-0 flex-1 truncate text-sm leading-tight font-semibold">
                      {inv.member_name}
                    </p>
                    <Badge
                      variant={statusVariant(inv.status)}
                      className="text-small shrink-0 px-1.5 py-0"
                    >
                      {statusLabel(inv.status, Boolean(inv.reference))}
                    </Badge>
                  </div>
                  <p className="text-text-secondary text-small mt-0.5 truncate leading-snug">
                    <span className="text-brand font-semibold tabular-nums">${inv.amount_usd}</span>
                    <span className="text-text-muted mx-1.5">·</span>
                    <span>{inv.title}</span>
                    {inv.reference ? (
                      <>
                        <span className="text-text-muted mx-1.5">·</span>
                        <span className="text-small font-mono">Ref. {inv.reference}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                {inv.status === 'pending' && inv.reference ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      size="sm"
                      variant="secondary"
                      className="border-success/30 text-success hover:bg-success/10"
                      aria-label="Confirmar cobro"
                      title="Confirmar"
                      onClick={() =>
                        void confirmInv.mutateAsync(inv.id).then(
                          () => toast?.success('Cobro confirmado'),
                          (err) => toast?.error(toDisplayErrorMessage(err))
                        )
                      }
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="danger"
                      aria-label="Rechazar cobro"
                      title="Rechazar"
                      onClick={() => {
                        setRejectId(inv.id);
                        setRejectReason('');
                      }}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                    </IconButton>
                  </div>
                ) : null}
                {inv.status === 'pending' && !inv.reference ? (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Cancelar cobro"
                    title="Cancelar"
                    onClick={() =>
                      void cancelInv.mutateAsync(inv.id).then(
                        () => toast?.success('Cobro cancelado'),
                        (err) => toast?.error(toDisplayErrorMessage(err))
                      )
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                ) : null}
              </div>
            </DataCard>
          ))}
        </div>
      )}

      <div className={cn(SURFACE, 'overflow-hidden')}>
        <button
          type="button"
          onClick={() => setConfigOpen((o) => !o)}
          className="text-text hover:bg-surface-overlay flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors sm:px-4"
          aria-expanded={configOpen}
        >
          <Settings2 className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 text-sm font-semibold">Configuración</span>
          <ChevronDown
            className={cn(
              'text-text-muted h-3.5 w-3.5 shrink-0 transition-transform',
              configOpen && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        {configOpen ? (
          <div className="border-border/60 space-y-3 border-t p-3.5 sm:p-4">
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <div className="space-y-3">
                <h3 className="text-text text-sm font-semibold">Mis tarifas</h3>
                {loadingOffers ? (
                  <Spinner />
                ) : (
                  <ul className="divide-border/60 divide-y">
                    {offers.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
                      >
                        <span
                          className={
                            o.active ? 'truncate' : 'text-text-muted truncate line-through'
                          }
                        >
                          {o.title}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">${o.price_usd}</span>
                      </li>
                    ))}
                    {offers.length === 0 ? (
                      <li className="text-text-muted text-small py-1">Sin tarifas aún</li>
                    ) : null}
                  </ul>
                )}
                <div className="space-y-2.5">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      placeholder="Ej. Sesión 1:1"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Precio USD</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => void onCreateOffer()}
                    disabled={!offerTitle.trim() || !offerPrice || createOffer.isPending}
                    loading={createOffer.isPending}
                  >
                    Guardar tarifa
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-text text-sm font-semibold">Tasa de referencia</h3>
                <div>
                  <Label>Preferencia</Label>
                  <Select
                    value={ratePref}
                    onChange={(e) => setRatePref(e.target.value as 'bcv' | 'euro')}
                  >
                    <option value="bcv">Tasa BCV (oficial del gym)</option>
                    <option value="euro">Tasa manual</option>
                  </Select>
                </div>
                {ratePref === 'euro' ? (
                  <>
                    <div>
                      <Label>Bs por 1 USD</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={euroRate}
                        onChange={(e) => setEuroRate(e.target.value)}
                        placeholder="Ej. 85.50"
                      />
                    </div>
                    <div>
                      <Label>Nota (opcional)</Label>
                      <Input
                        value={euroNote}
                        onChange={(e) => setEuroNote(e.target.value)}
                        placeholder="Referencia del día"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-text-secondary text-small leading-snug">
                    {rateCtx?.bcv_bs_per_usd
                      ? `BCV vigente: ${rateCtx.bcv_bs_per_usd.toLocaleString('es-VE')} Bs/USD`
                      : 'Sin tasa BCV disponible aún'}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  loading={updateRate.isPending}
                  onClick={() => {
                    void updateRate
                      .mutateAsync({
                        rate_preference: ratePref,
                        euro_rate: ratePref === 'euro' ? Number(euroRate) : null,
                        euro_rate_note: euroNote,
                      })
                      .then(
                        () => toast?.success('Preferencia de tasa guardada'),
                        (err) => toast?.error(toDisplayErrorMessage(err))
                      );
                  }}
                >
                  Guardar tasa
                </Button>
              </div>
            </div>

            <div id="pt-dest-section" className="border-border/60 border-t pt-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  onClick={() => setDestOpen((o) => !o)}
                  className="text-text hover:bg-surface-overlay flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left transition-colors"
                  aria-expanded={destOpen}
                >
                  <span className="bg-brand/10 text-brand mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <Landmark className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      Datos de cobro
                      {!destReady ? (
                        <span className="text-warning text-small font-medium">pendiente</span>
                      ) : (
                        <span className="text-text-muted text-small font-medium">listo</span>
                      )}
                      <ChevronDown
                        className={cn(
                          'text-text-muted h-3.5 w-3.5 shrink-0 transition-transform',
                          destOpen && 'rotate-180'
                        )}
                        aria-hidden
                      />
                    </span>
                    <span className="text-text-muted text-small mt-1 block leading-snug">
                      Teléfono, cuenta o Zelle que verá el cliente
                    </span>
                  </span>
                </button>
                {destOpen ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full shrink-0 sm:w-auto"
                    disabled={updateDest.isPending}
                    loading={updateDest.isPending}
                    onClick={onSaveDest}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar datos
                  </Button>
                ) : null}
              </div>

              {destOpen ? (
                <div className="border-border/60 mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <label className="flex items-center gap-2.5 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={destForm.pago_movil.enabled}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          pago_movil: { ...f.pago_movil, enabled: e.target.checked },
                        }))
                      }
                    />
                    {PAYMENT_METHOD_LABELS.pago_movil}
                  </label>
                  <Input
                    placeholder="Teléfono"
                    value={destForm.pago_movil.phone}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        pago_movil: { ...f.pago_movil, phone: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Cédula"
                    value={destForm.pago_movil.holder_cedula}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        pago_movil: { ...f.pago_movil, holder_cedula: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Banco"
                    className="sm:col-span-2"
                    value={destForm.pago_movil.bank_name}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        pago_movil: { ...f.pago_movil, bank_name: e.target.value },
                      }))
                    }
                  />

                  <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={destForm.transferencia.enabled}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          transferencia: { ...f.transferencia, enabled: e.target.checked },
                        }))
                      }
                    />
                    {PAYMENT_METHOD_LABELS.transferencia}
                  </label>
                  <Input
                    placeholder="Titular"
                    value={destForm.transferencia.holder_name}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        transferencia: { ...f.transferencia, holder_name: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Cédula"
                    value={destForm.transferencia.holder_cedula}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        transferencia: { ...f.transferencia, holder_cedula: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Banco"
                    value={destForm.transferencia.bank_name}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        transferencia: { ...f.transferencia, bank_name: e.target.value },
                      }))
                    }
                  />
                  <Select
                    value={destForm.transferencia.account_type}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        transferencia: {
                          ...f.transferencia,
                          account_type: e.target.value as 'corriente' | 'ahorro' | '',
                        },
                      }))
                    }
                  >
                    <option value="">Tipo de cuenta…</option>
                    <option value="corriente">Corriente</option>
                    <option value="ahorro">Ahorro</option>
                  </Select>
                  <Input
                    placeholder="Número de cuenta"
                    className="sm:col-span-2"
                    value={destForm.transferencia.account_number}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        transferencia: { ...f.transferencia, account_number: e.target.value },
                      }))
                    }
                  />

                  <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={destForm.zelle.enabled}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          zelle: { ...f.zelle, enabled: e.target.checked },
                        }))
                      }
                    />
                    {PAYMENT_METHOD_LABELS.zelle}
                  </label>
                  <Input
                    placeholder="Correo Zelle"
                    className="sm:col-span-2"
                    value={destForm.zelle.email}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        zelle: { ...f.zelle, email: e.target.value },
                      }))
                    }
                  />

                  <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={destForm.usdt.enabled}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          usdt: { ...f.usdt, enabled: e.target.checked },
                        }))
                      }
                    />
                    {PAYMENT_METHOD_LABELS.usdt}
                  </label>
                  <Input
                    placeholder="Correo Binance"
                    value={destForm.usdt.binance_email}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        usdt: { ...f.usdt, binance_email: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Binance ID"
                    value={destForm.usdt.binance_id}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        usdt: { ...f.usdt, binance_id: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="Red / activo (ej. USDT TRC20)"
                    className="sm:col-span-2"
                    value={destForm.usdt.network}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        usdt: { ...f.usdt, network: e.target.value },
                      }))
                    }
                  />

                  <label className="mt-3 flex items-center gap-2.5 text-sm font-semibold sm:col-span-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={destForm.efectivo_usd.enabled}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          efectivo_usd: { ...f.efectivo_usd, enabled: e.target.checked },
                        }))
                      }
                    />
                    {PAYMENT_METHOD_LABELS.efectivo_usd}
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {DEFAULT_USD_DENOMINATIONS.map((d) => (
                      <label
                        key={d}
                        className="border-border text-small inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border px-2.5 py-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={destForm.efectivo_usd.denominations.includes(d)}
                          onChange={(e) => {
                            setDestForm((f) => {
                              const set = new Set(f.efectivo_usd.denominations);
                              if (e.target.checked) set.add(d);
                              else set.delete(d);
                              return {
                                ...f,
                                efectivo_usd: {
                                  ...f.efectivo_usd,
                                  denominations: [...set].sort((a, b) => a - b),
                                },
                              };
                            });
                          }}
                        />
                        ${d}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        title={<>Nuevo cobro</>}
        maxWidth="md"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setChargeOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => void onCreateInvoice()}
              disabled={!memberId || !amount || createInvoice.isPending || members.length === 0}
              loading={createInvoice.isPending}
            >
              Enviar
            </Button>
          </>
        }
      >
        {loadingMembers ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : members.length === 0 ? (
          <div className="space-y-3">
            <p className="text-text-muted text-sm leading-relaxed">
              No hay clientes elegibles. Aparecen los asignados a ti o con una rutina tuya.
            </p>
            <Link
              to="/members"
              className="border-border text-text hover:bg-surface-overlay inline-flex min-h-9 items-center justify-center rounded-[var(--radius-button)] border px-3 text-sm font-semibold transition-colors"
            >
              Ver mis miembros
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <Label>Cliente</Label>
              <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">Seleccionar…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                    {m.cedula ? ` — ${m.cedula}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Concepto</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Sesión 1:1"
              />
            </div>
            <div>
              <Label>Tarifa</Label>
              <Select
                value={offerId}
                onChange={(e) => {
                  setOfferId(e.target.value);
                  const o = offers.find((x) => String(x.id) === e.target.value);
                  if (o) {
                    setAmount(String(o.price_usd));
                    setTitle(o.title);
                  }
                }}
              >
                <option value="">Monto manual</option>
                {activeOffers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} — ${o.price_usd}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {amount && rateCtx?.active_bs_per_usd ? (
                <p className="text-text-muted text-small mt-1.5">
                  ≈{' '}
                  {(Number(amount) * rateCtx.active_bs_per_usd).toLocaleString('es-VE', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  Bs ({rateCtx.active_label})
                </p>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={rejectId != null}
        onClose={() => setRejectId(null)}
        title={<>Rechazar cobro</>}
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setRejectId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="flex-1"
              disabled={rejectReason.trim().length < 3 || rejectInv.isPending}
              loading={rejectInv.isPending}
              onClick={() => {
                if (rejectId == null) return;
                void rejectInv.mutateAsync({ id: rejectId, reason: rejectReason.trim() }).then(
                  () => {
                    toast?.success('Cobro rechazado');
                    setRejectId(null);
                  },
                  (err) => toast?.error(toDisplayErrorMessage(err))
                );
              }}
            >
              Rechazar
            </Button>
          </>
        }
      >
        <div>
          <Label>Motivo</Label>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Mínimo 3 caracteres"
          />
        </div>
      </Modal>

      <Modal
        open={destWizardOpen}
        onClose={() => {
          try {
            sessionStorage.setItem('gymapure_pt_dest_wizard', '1');
          } catch {
            /* ignore */
          }
          setDestWizardOpen(false);
        }}
        title="¿Dónde te pagan?"
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => {
                try {
                  sessionStorage.setItem('gymapure_pt_dest_wizard', '1');
                } catch {
                  /* ignore */
                }
                setDestWizardOpen(false);
              }}
            >
              Después
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => {
                try {
                  sessionStorage.setItem('gymapure_pt_dest_wizard', '1');
                } catch {
                  /* ignore */
                }
                setDestWizardOpen(false);
                setConfigOpen(true);
                setDestOpen(true);
              }}
            >
              Configurar
            </Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-relaxed">
          Antes del primer cobro, publica pago móvil, transferencia u otro método para que el
          cliente sepa a dónde transferir.
        </p>
      </Modal>
    </div>
  );
}
