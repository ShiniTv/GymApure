import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, CheckCircle2, Clock, Landmark, Plus, Settings2, X } from 'lucide-react';
import {
  Badge,
  Button,
  BackToDashboardLink,
  FilterChips,
  IconButton,
  Input,
  Label,
  Modal,
  SearchInput,
  Select,
  Spinner,
} from '../components/ui';
import {
  OperateCallout,
  OperateEmpty,
  OperateHeader,
  OperateIcon,
  OperateMetricStrip,
  OperatePage,
} from '../components/operate/OperateChrome';
import {
  TrainerPtBillingInspector,
  type InspectorTab,
} from '../components/trainer/TrainerPtBillingInspector';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import { cn } from '../lib/utils';
import {
  defaultPaymentDestinations,
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

type InvoiceFilter = 'all' | 'confirm' | 'awaiting' | 'done';

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

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('invoice');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
  const [chargeOpen, setChargeOpen] = useState(false);
  const [destWizardOpen, setDestWizardOpen] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('confirm');

  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'pending');
  const awaitingPay = pendingInvoices.filter((invoice) => !invoice.reference);
  const awaitingConfirm = pendingInvoices.filter((invoice) => Boolean(invoice.reference));
  const activeOffers = offers.filter((offer) => offer.active);
  const destReady = hasEnabledDestination(destForm);
  const doneInvoices = invoices.filter((inv) => matchesFilter(inv, 'done'));

  const totalEarnedUsd = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'confirmed')
      .reduce((sum, inv) => sum + (Number(inv.amount_usd) || 0), 0);
  }, [invoices]);

  const totalPendingUsd = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + (Number(inv.amount_usd) || 0), 0);
  }, [pendingInvoices]);

  useEffect(() => {
    if (loadingInvoices) return;
    setInvoiceFilter((prev) => {
      if (prev === 'all' || prev === 'done') return prev;
      if (prev === 'confirm' && awaitingConfirm.length > 0) return prev;
      if (prev === 'awaiting' && awaitingPay.length > 0) return prev;
      if (awaitingConfirm.length > 0) return 'confirm';
      if (awaitingPay.length > 0) return 'awaiting';
      return 'all';
    });
  }, [loadingInvoices, awaitingConfirm.length, awaitingPay.length]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchFilter = matchesFilter(inv, invoiceFilter);
      if (!matchFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        inv.member_name.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q) ||
        (inv.reference && inv.reference.toLowerCase().includes(q))
      );
    });
  }, [invoices, invoiceFilter, searchTerm]);

  // Auto-select first invoice when list changes if none selected or if selected is no longer in filter
  useEffect(() => {
    if (filteredInvoices.length > 0) {
      const exists = filteredInvoices.some((inv) => inv.id === selectedInvoiceId);
      if (!exists && selectedInvoiceId !== null) {
        setSelectedInvoiceId(filteredInvoices[0].id);
      } else if (selectedInvoiceId === null) {
        setSelectedInvoiceId(filteredInvoices[0].id);
      }
    }
  }, [filteredInvoices, selectedInvoiceId]);

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
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
      const res = await createInvoice.mutateAsync({
        member_id: Number(memberId),
        title: title.trim() || 'Cobro PT',
        amount_usd: Number(amount),
        offer_id: offerId ? Number(offerId) : null,
      });
      toast?.success('Enviaste el cobro al cliente');
      setAmount('');
      setChargeOpen(false);
      setInvoiceFilter('awaiting');
      if (res && typeof res === 'object' && 'id' in res) {
        setSelectedInvoiceId((res as { id: number }).id);
      }
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
      toast?.success('Tarifa guardada con éxito');
      setOfferPrice('');
      setOfferTitle('');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err));
    }
  };

  const onSaveDest = () => {
    void updateDest.mutateAsync(destForm).then(
      () => toast?.success('Guardaste tus cuentas de cobro'),
      (err) => toast?.error(toDisplayErrorMessage(err))
    );
  };

  const onSaveRate = () => {
    void updateRate
      .mutateAsync({
        rate_preference: ratePref,
        euro_rate: ratePref === 'euro' ? Number(euroRate) : null,
        euro_rate_note: euroNote,
      })
      .then(
        () => toast?.success('Preferencia de tasa actualizada'),
        (err) => toast?.error(toDisplayErrorMessage(err))
      );
  };

  const handleSelectInvoice = (inv: TrainerInvoice) => {
    setSelectedInvoiceId(inv.id);
    setInspectorTab('invoice');
    if (window.innerWidth < 1024) {
      setMobileDetailOpen(true);
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
        subtitle={
          loadingInvoices
            ? 'Cargando registros de asesoría…'
            : awaitingConfirm.length > 0
              ? `${awaitingConfirm.length} cobro(s) con pago reportado por verificar`
              : 'Gestión de cobros 1:1, verificación de pagos, tarifas y cuentas'
        }
        action={
          <>
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <span className="hidden sm:inline-flex">
              <BackToDashboardLink />
            </span>
            <Button
              size="md"
              className="shadow-brand/20 gap-1.5 shadow-md"
              onClick={() => setChargeOpen(true)}
            >
              <Plus className="operate-icon h-4 w-4" />
              Nuevo Cobro
            </Button>
          </>
        }
      />

      {!destReady && !loadingInvoices ? (
        <OperateCallout
          icon={Settings2}
          tone="warn"
          onClick={() => {
            setInspectorTab('destinations');
            if (window.innerWidth < 1024) {
              setMobileDetailOpen(true);
            }
          }}
        >
          <span className="text-text font-semibold">Configura tus datos de cobro</span>
          <span className="text-text-muted">
            {' '}
            · Agrega pago móvil, cuenta bancaria o Zelle para que los clientes sepan a dónde pagar.
          </span>
        </OperateCallout>
      ) : null}

      {/* KPI Stats Strip */}
      <OperateMetricStrip
        loading={loadingInvoices}
        items={[
          {
            label: 'Total Facturado',
            value: `$${(totalEarnedUsd + totalPendingUsd).toFixed(0)}`,
            subtext: `${invoices.length} registro(s)`,
            icon: Landmark,
            onClick: () => setInvoiceFilter('all'),
          },
          {
            label: 'Por Confirmar',
            value: awaitingConfirm.length,
            subtext: awaitingConfirm.length > 0 ? '¡Reportes listos!' : 'Al día',
            icon: Check,
            onClick: () => setInvoiceFilter('confirm'),
          },
          {
            label: 'Esperando Pago',
            value: awaitingPay.length,
            subtext: `$${totalPendingUsd.toFixed(0)} en cola`,
            icon: Clock,
            onClick: () => setInvoiceFilter('awaiting'),
          },
          {
            label: 'Cobrado / Cerrados',
            value: `$${totalEarnedUsd.toFixed(0)}`,
            subtext: `${doneInvoices.length} cobro(s)`,
            icon: CheckCircle2,
            onClick: () => setInvoiceFilter('done'),
          },
        ]}
      />

      {/* 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(23rem,27rem)] lg:items-start">
        {/* LEFT COLUMN: Controls + Invoices List */}
        <div className="space-y-4">
          {/* Filter Chips & Search Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChips
              options={[
                { value: 'confirm', label: 'Por confirmar', count: awaitingConfirm.length },
                { value: 'awaiting', label: 'Esperando', count: awaitingPay.length },
                { value: 'all', label: 'Todos', count: invoices.length },
                { value: 'done', label: 'Cerrados', count: doneInvoices.length },
              ]}
              value={invoiceFilter}
              onChange={(v) => setInvoiceFilter(v as InvoiceFilter)}
            />

            <div className="w-full sm:w-64">
              <SearchInput
                placeholder="Buscar cliente, concepto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* List Content */}
          {loadingInvoices ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border-border/60 bg-surface/80 flex h-20 animate-pulse rounded-xl border p-4"
                />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <OperateEmpty
              icon={Landmark}
              title="Sin cobros registrados aún"
              description={
                members.length === 0
                  ? 'Asigna miembros o crea una rutina; luego envía el primer cobro.'
                  : 'Pulsa el botón superior para enviar un cobro de entrenamiento 1:1 a un cliente.'
              }
              action={
                members.length === 0 ? (
                  <Link to="/members">
                    <Button size="sm" variant="secondary">
                      Ver mis miembros
                    </Button>
                  </Link>
                ) : (
                  <Button size="md" className="gap-1.5" onClick={() => setChargeOpen(true)}>
                    <Plus className="operate-icon h-4 w-4" />
                    Nuevo cobro
                  </Button>
                )
              }
            />
          ) : filteredInvoices.length === 0 ? (
            <OperateEmpty
              icon={Landmark}
              title="No hay cobros en este filtro"
              description="Prueba cambiando los filtros de búsqueda o crea un nuevo cobro."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setInvoiceFilter('all');
                      setSearchTerm('');
                    }}
                  >
                    Ver todos los cobros
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => setChargeOpen(true)}>
                    <Plus className="operate-icon h-4 w-4" />
                    Nuevo cobro
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {filteredInvoices.map((inv) => {
                const isSelected = selectedInvoiceId === inv.id;
                const isConfirmWaiting = inv.status === 'pending' && Boolean(inv.reference);

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
                      'border-border/70 bg-surface/90 hover:border-brand/40 hover:bg-surface-raised/60 group relative flex cursor-pointer items-center justify-between gap-3.5 rounded-xl border p-3.5 transition-all duration-150',
                      isSelected &&
                        'border-brand/70 ring-brand/30 bg-surface-raised/90 shadow-brand/5 shadow-md ring-2'
                    )}
                  >
                    {/* Left Icon with well */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <OperateIcon
                        icon={
                          inv.status === 'confirmed' ? CheckCircle2 : inv.reference ? Check : Clock
                        }
                        tone={
                          inv.status === 'confirmed'
                            ? 'success'
                            : inv.status === 'rejected' || inv.status === 'cancelled'
                              ? 'danger'
                              : inv.reference
                                ? 'brand'
                                : 'warn'
                        }
                        well
                        size="md"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'truncate text-sm font-semibold tracking-[-0.011em]',
                              isSelected ? 'text-brand' : 'text-text'
                            )}
                          >
                            {inv.member_name}
                          </p>
                          <Badge
                            variant={statusVariant(inv.status)}
                            className="shrink-0 px-1.5 py-0 text-[10px]"
                          >
                            {statusLabel(inv.status, Boolean(inv.reference))}
                          </Badge>
                          {isConfirmWaiting && (
                            <span className="bg-brand inline-block h-2 w-2 shrink-0 animate-pulse rounded-full" />
                          )}
                        </div>

                        <div className="text-text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-brand font-bold tabular-nums">
                            ${inv.amount_usd} USD
                          </span>
                          <span>·</span>
                          <span className="text-text-secondary max-w-[14rem] truncate">
                            {inv.title}
                          </span>
                          {inv.reference && (
                            <>
                              <span>·</span>
                              <span className="text-brand font-mono text-[11px] font-semibold">
                                Ref: {inv.reference}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons on hover or selection */}
                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      role="none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {inv.status === 'pending' && inv.reference ? (
                        <>
                          <IconButton
                            size="sm"
                            variant="secondary"
                            className="border-success/40 text-success hover:bg-success/15"
                            aria-label="Confirmar cobro"
                            title="Confirmar"
                            onClick={() =>
                              void confirmInv.mutateAsync(inv.id).then(
                                () => toast?.success('Cobro confirmado exitosamente'),
                                (err) => toast?.error(toDisplayErrorMessage(err))
                              )
                            }
                          >
                            <Check className="h-4 w-4" strokeWidth={2.5} />
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
                            <X className="h-4 w-4" strokeWidth={2.5} />
                          </IconButton>
                        </>
                      ) : null}

                      {inv.status === 'pending' && !inv.reference ? (
                        <IconButton
                          size="sm"
                          variant="secondary"
                          aria-label="Cancelar cobro"
                          title="Cancelar"
                          onClick={() =>
                            void cancelInv.mutateAsync(inv.id).then(
                              () => toast?.success('Cobro cancelado'),
                              (err) => toast?.error(toDisplayErrorMessage(err))
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </IconButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sticky Inspector Panel on Desktop */}
        <div className="hidden lg:sticky lg:top-20 lg:block">
          <TrainerPtBillingInspector
            selectedInvoice={selectedInvoice}
            rateCtx={rateCtx}
            offers={offers}
            loadingOffers={loadingOffers}
            destForm={destForm}
            setDestForm={setDestForm}
            onSaveDest={onSaveDest}
            isSavingDest={updateDest.isPending}
            ratePref={ratePref}
            setRatePref={setRatePref}
            euroRate={euroRate}
            setEuroRate={setEuroRate}
            euroNote={euroNote}
            setEuroNote={setEuroNote}
            onSaveRate={onSaveRate}
            isSavingRate={updateRate.isPending}
            offerTitle={offerTitle}
            setOfferTitle={setOfferTitle}
            offerPrice={offerPrice}
            setOfferPrice={setOfferPrice}
            onCreateOffer={() => void onCreateOffer()}
            isCreatingOffer={createOffer.isPending}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            onConfirmInvoice={(inv) =>
              void confirmInv.mutateAsync(inv.id).then(
                () => toast?.success('Confirmaste el cobro'),
                (err) => toast?.error(toDisplayErrorMessage(err))
              )
            }
            onOpenRejectModal={(inv) => {
              setRejectId(inv.id);
              setRejectReason('');
            }}
            onCancelInvoice={(inv) =>
              void cancelInv.mutateAsync(inv.id).then(
                () => toast?.success('Cancelaste el cobro'),
                (err) => toast?.error(toDisplayErrorMessage(err))
              )
            }
            onOpenNewCharge={() => setChargeOpen(true)}
            className="max-h-[calc(100vh-6rem)]"
          />
        </div>
      </div>

      {/* MOBILE DETAIL MODAL */}
      <Modal
        open={mobileDetailOpen}
        onClose={() => setMobileDetailOpen(false)}
        title={
          inspectorTab === 'invoice'
            ? 'Detalle del Cobro'
            : inspectorTab === 'rates'
              ? 'Tarifas y Tasa'
              : 'Cuentas Receptoras'
        }
        maxWidth="md"
        scrollable
      >
        <TrainerPtBillingInspector
          selectedInvoice={selectedInvoice}
          rateCtx={rateCtx}
          offers={offers}
          loadingOffers={loadingOffers}
          destForm={destForm}
          setDestForm={setDestForm}
          onSaveDest={onSaveDest}
          isSavingDest={updateDest.isPending}
          ratePref={ratePref}
          setRatePref={setRatePref}
          euroRate={euroRate}
          setEuroRate={setEuroRate}
          euroNote={euroNote}
          setEuroNote={setEuroNote}
          onSaveRate={onSaveRate}
          isSavingRate={updateRate.isPending}
          offerTitle={offerTitle}
          setOfferTitle={setOfferTitle}
          offerPrice={offerPrice}
          setOfferPrice={setOfferPrice}
          onCreateOffer={() => void onCreateOffer()}
          isCreatingOffer={createOffer.isPending}
          activeTab={inspectorTab}
          onTabChange={setInspectorTab}
          onConfirmInvoice={(inv) => {
            void confirmInv.mutateAsync(inv.id).then(
              () => {
                toast?.success('Confirmaste el cobro');
                setMobileDetailOpen(false);
              },
              (err) => toast?.error(toDisplayErrorMessage(err))
            );
          }}
          onOpenRejectModal={(inv) => {
            setRejectId(inv.id);
            setRejectReason('');
          }}
          onCancelInvoice={(inv) => {
            void cancelInv.mutateAsync(inv.id).then(
              () => {
                toast?.success('Cancelaste el cobro');
                setMobileDetailOpen(false);
              },
              (err) => toast?.error(toDisplayErrorMessage(err))
            );
          }}
          onOpenNewCharge={() => {
            setMobileDetailOpen(false);
            setChargeOpen(true);
          }}
        />
      </Modal>

      {/* NEW CHARGE MODAL */}
      <Modal
        open={chargeOpen}
        onClose={() => setChargeOpen(false)}
        title={<>Nuevo Cobro de Entrenamiento</>}
        maxWidth="md"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
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
              Enviar Cobro
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
                placeholder="Ej. Sesión 1:1, Plan Mensual"
              />
            </div>
            <div>
              <Label>Tarifa predefinida (opcional)</Label>
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
                    {o.title} — ${o.price_usd} USD
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

      {/* REJECT MODAL */}
      <Modal
        open={rejectId != null}
        onClose={() => setRejectId(null)}
        title={<>Rechazar Cobro</>}
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
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
                    toast?.success('Rechazaste el cobro');
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
          <Label>Motivo de rechazo para el cliente</Label>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ej. Referencia no coincide con la cuenta"
          />
        </div>
      </Modal>

      {/* DESTINATION WIZARD */}
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
        title="¿Dónde te pagan tus alumnos?"
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
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
              Más tarde
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
                setInspectorTab('destinations');
                if (window.innerWidth < 1024) {
                  setMobileDetailOpen(true);
                }
              }}
            >
              Configurar Cuentas
            </Button>
          </>
        }
      >
        <p className="text-text-secondary text-sm leading-relaxed">
          Antes de tu primer cobro, configura tus datos de Pago Móvil, transferencia o Zelle para
          que tus alumnos puedan reportar sus comprobantes de forma rápida y sencilla.
        </p>
      </Modal>
    </OperatePage>
  );
}
