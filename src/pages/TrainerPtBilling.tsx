import { useEffect, useState } from 'react';
import { Landmark, Plus, Save } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  Spinner,
  BackToDashboardLink,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { toDisplayErrorMessage } from '../lib/api';
import {
  defaultPaymentDestinations,
  DEFAULT_USD_DENOMINATIONS,
  PAYMENT_METHOD_LABELS,
  type PaymentDestinations,
} from '../lib/paymentDestinationsCore';
import {
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

  useEffect(() => {
    if (destinations) setDestForm(destinations);
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
      toast?.success('Cobro creado — el cliente puede reportar el pago');
      setAmount('');
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

  return (
    <div className="page-stack mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        title={
          <>
            Cobros <span className="text-brand">PT</span>
          </>
        }
        subtitle="Solo entre tú y tus clientes asignados. No forma parte de la membresía del gym."
        action={<BackToDashboardLink />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="sm" rounded="xl" className="space-y-3 md:p-4">
          <h2 className="text-sm font-bold">Nuevo cobro</h2>
          {loadingMembers ? (
            <Spinner />
          ) : members.length === 0 ? (
            <p className="text-text-muted text-xs">Aún no tienes miembros asignados.</p>
          ) : (
            <>
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
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Tarifa (opcional)</Label>
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
                  <option value="">Sin tarifa predefinida</option>
                  {offers
                    .filter((o) => o.active)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} — ${o.price_usd}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label>Monto USD</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amount && rateCtx?.active_bs_per_usd ? (
                  <p className="text-text-muted mt-1 text-[11px]">
                    ≈{' '}
                    {(Number(amount) * rateCtx.active_bs_per_usd).toLocaleString('es-VE', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    Bs ({rateCtx.active_label})
                  </p>
                ) : null}
              </div>
              <Button
                onClick={() => void onCreateInvoice()}
                disabled={!memberId || !amount || createInvoice.isPending}
                loading={createInvoice.isPending}
              >
                <Plus className="h-4 w-4" />
                Crear cobro
              </Button>
            </>
          )}
        </Card>

        <Card padding="sm" rounded="xl" className="space-y-3 md:p-4">
          <h2 className="text-sm font-bold">Mis tarifas</h2>
          {loadingOffers ? (
            <Spinner />
          ) : (
            <ul className="divide-border divide-y text-sm">
              {offers.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <span className={o.active ? '' : 'text-text-muted line-through'}>{o.title}</span>
                  <span className="font-semibold tabular-nums">${o.price_usd}</span>
                </li>
              ))}
              {offers.length === 0 && (
                <li className="text-text-muted py-2 text-xs">Sin tarifas aún.</li>
              )}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Nombre tarifa"
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
            />
            <Input
              type="number"
              placeholder="USD"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onCreateOffer()}
            disabled={!offerTitle.trim() || !offerPrice || createOffer.isPending}
          >
            Guardar tarifa
          </Button>
        </Card>
      </div>

      <Card padding="sm" rounded="xl" className="space-y-3 md:p-4">
        <div className="flex items-center gap-2">
          <Landmark className="text-brand h-4 w-4" />
          <h2 className="text-sm font-bold">Mis datos de cobro (PT)</h2>
          <Button
            size="sm"
            className="ml-auto h-9 min-h-9 w-9 min-w-9 p-0"
            onClick={() => {
              void updateDest.mutateAsync(destForm).then(
                () => toast?.success('Datos de cobro PT guardados'),
                (err) => toast?.error(toDisplayErrorMessage(err))
              );
            }}
            disabled={updateDest.isPending}
            aria-label="Guardar"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-text-muted text-[11px]">
          Estos datos solo los ven tus clientes asignados al pagar PT — no son los del gym.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
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
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
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
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
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
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
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
          <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2">
            <input
              type="checkbox"
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
                className="border-border rounded-chip inline-flex items-center gap-1 border px-2 py-1 text-[11px]"
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
      </Card>

      <Card padding="sm" rounded="xl" className="space-y-3 md:p-4">
        <h2 className="text-sm font-bold">Tasa de referencia (Bs)</h2>
        <p className="text-text-muted text-[11px]">
          Solo para cobros PT. La membresía del gym sigue usando BCV. &quot;Tasa euro&quot; es tu
          referencia en Bs por 1 USD (no convierte a euros).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Preferencia</Label>
            <Select
              value={ratePref}
              onChange={(e) => setRatePref(e.target.value as 'bcv' | 'euro')}
            >
              <option value="bcv">Tasa BCV (oficial del gym)</option>
              <option value="euro">Tasa euro (manual)</option>
            </Select>
          </div>
          {ratePref === 'euro' ? (
            <div>
              <Label>Bs por 1 USD (tasa euro)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={euroRate}
                onChange={(e) => setEuroRate(e.target.value)}
                placeholder="Ej. 85.50"
              />
            </div>
          ) : (
            <div className="flex items-end">
              <p className="text-text-secondary text-xs">
                {rateCtx?.bcv_bs_per_usd
                  ? `BCV vigente: ${rateCtx.bcv_bs_per_usd.toLocaleString('es-VE')} Bs/USD`
                  : 'Sin tasa BCV disponible aún'}
              </p>
            </div>
          )}
          {ratePref === 'euro' ? (
            <div className="sm:col-span-2">
              <Label>Nota (opcional)</Label>
              <Input
                value={euroNote}
                onChange={(e) => setEuroNote(e.target.value)}
                placeholder="Ej. tasa del día según tu referencia"
              />
            </div>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
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
      </Card>

      <Card padding="sm" rounded="xl" className="md:p-4">
        <h2 className="mb-3 text-sm font-bold">Cobros recientes</h2>
        {loadingInvoices ? (
          <Spinner />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Sin cobros PT"
            description="Crea un cobro para un cliente asignado."
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
                    {inv.title} · {inv.member_name}
                  </p>
                  <p className="text-text-secondary text-xs">
                    ${inv.amount_usd}
                    {inv.reference ? ` · Ref. ${inv.reference}` : ''}
                    {inv.method ? ` · ${inv.method}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                  {inv.status === 'pending' && inv.reference ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          void confirmInv.mutateAsync(inv.id).then(
                            () => toast?.success('Cobro confirmado'),
                            (err) => toast?.error(toDisplayErrorMessage(err))
                          )
                        }
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRejectId(inv.id);
                          setRejectReason('');
                        }}
                      >
                        Rechazar
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {rejectId != null && (
          <div className="border-border mt-3 space-y-2 border-t pt-3">
            <Label>Motivo del rechazo</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={rejectReason.trim().length < 3}
                onClick={() =>
                  void rejectInv.mutateAsync({ id: rejectId, reason: rejectReason.trim() }).then(
                    () => {
                      toast?.success('Cobro rechazado');
                      setRejectId(null);
                    },
                    (err) => toast?.error(toDisplayErrorMessage(err))
                  )
                }
              >
                Confirmar rechazo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
