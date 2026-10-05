import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Landmark,
  Plus,
  Save,
  Tag,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Label,
  SegmentedControl,
  Select,
  Spinner,
} from '../ui';
import { cn } from '../../lib/utils';
import {
  DEFAULT_USD_DENOMINATIONS,
  PAYMENT_METHOD_LABELS,
  type PaymentDestinations,
} from '../../lib/paymentDestinationsCore';
import type {
  TrainerInvoice,
  TrainerOffer,
  TrainerRateContext,
} from '../../hooks/queries/useTrainerBillingQuery';

export type InspectorTab = 'invoice' | 'rates' | 'destinations';

interface TrainerPtBillingInspectorProps {
  selectedInvoice: TrainerInvoice | null;
  rateCtx?: TrainerRateContext;
  offers: TrainerOffer[];
  loadingOffers?: boolean;
  destForm: PaymentDestinations;
  setDestForm: React.Dispatch<React.SetStateAction<PaymentDestinations>>;
  onSaveDest: () => void;
  isSavingDest?: boolean;
  ratePref: 'bcv' | 'euro';
  setRatePref: (v: 'bcv' | 'euro') => void;
  euroRate: string;
  setEuroRate: (v: string) => void;
  euroNote: string;
  setEuroNote: (v: string) => void;
  onSaveRate: () => void;
  isSavingRate?: boolean;
  offerTitle: string;
  setOfferTitle: (v: string) => void;
  offerPrice: string;
  setOfferPrice: (v: string) => void;
  onCreateOffer: () => void;
  isCreatingOffer?: boolean;
  onConfirmInvoice: (inv: TrainerInvoice) => void;
  onOpenRejectModal: (inv: TrainerInvoice) => void;
  onCancelInvoice: (inv: TrainerInvoice) => void;
  onOpenNewCharge: () => void;
  activeTab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
  className?: string;
}

export function TrainerPtBillingInspector({
  selectedInvoice,
  rateCtx,
  offers,
  loadingOffers,
  destForm,
  setDestForm,
  onSaveDest,
  isSavingDest,
  ratePref,
  setRatePref,
  euroRate,
  setEuroRate,
  euroNote,
  setEuroNote,
  onSaveRate,
  isSavingRate,
  offerTitle,
  setOfferTitle,
  offerPrice,
  setOfferPrice,
  onCreateOffer,
  isCreatingOffer,
  onConfirmInvoice,
  onOpenRejectModal,
  onCancelInvoice,
  onOpenNewCharge,
  activeTab: controlledTab,
  onTabChange,
  className,
}: TrainerPtBillingInspectorProps) {
  const [internalTab, setInternalTab] = useState<InspectorTab>('invoice');
  const currentTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: InspectorTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  const statusLabel = (status: string, hasReport?: boolean) => {
    if (status === 'confirmed') return 'Confirmado';
    if (status === 'rejected') return 'Rechazado';
    if (status === 'cancelled') return 'Cancelado';
    return hasReport ? 'Por confirmar' : 'Esperando pago';
  };

  const statusBadgeVariant = (status: string): 'success' | 'danger' | 'warning' | 'default' => {
    if (status === 'confirmed') return 'success';
    if (status === 'rejected' || status === 'cancelled') return 'danger';
    return 'warning';
  };

  return (
    <Card
      padding="none"
      rounded="2xl"
      className={cn(
        'border-border/80 bg-surface/95 flex flex-col overflow-hidden shadow-xl backdrop-blur-md',
        className
      )}
    >
      {/* Top Segment Selector */}
      <div className="border-border/70 bg-surface-raised/40 border-b p-3">
        <SegmentedControl
          size="sm"
          value={currentTab}
          onChange={(v) => handleTabChange(v)}
          options={[
            {
              value: 'invoice',
              label: (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Cobro
                </span>
              ),
            },
            {
              value: 'rates',
              label: (
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Tarifas y Tasa
                </span>
              ),
            },
            {
              value: 'destinations',
              label: (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5" />
                  Cuentas
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
        {/* TAB 1: INVOICE DOSSIER */}
        {currentTab === 'invoice' && (
          <div>
            {selectedInvoice ? (
              <div className="space-y-4">
                {/* Header Card */}
                <div className="border-border/60 bg-surface-raised/50 relative overflow-hidden rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={selectedInvoice.member_name} size="md" className="shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-text truncate text-base font-bold tracking-[-0.015em]">
                          {selectedInvoice.member_name}
                        </h3>
                        <p className="text-text-muted text-xs">Cliente de entrenamiento</p>
                      </div>
                    </div>
                    <Badge
                      variant={statusBadgeVariant(selectedInvoice.status)}
                      className="shrink-0 px-2 py-0.5 text-xs font-semibold"
                    >
                      {statusLabel(selectedInvoice.status, Boolean(selectedInvoice.reference))}
                    </Badge>
                  </div>

                  {/* Big Price Badge */}
                  <div className="border-border/50 bg-surface/80 mt-4 rounded-lg border p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-text-muted text-xs font-medium tracking-wider uppercase">
                        Monto del Cobro
                      </span>
                      <span className="text-brand text-2xl font-black tracking-tight tabular-nums">
                        ${selectedInvoice.amount_usd}{' '}
                        <span className="text-text-muted text-xs font-bold">USD</span>
                      </span>
                    </div>
                    {rateCtx?.active_bs_per_usd ? (
                      <p className="text-text-secondary mt-1 text-right text-xs font-medium">
                        ≈{' '}
                        {(
                          Number(selectedInvoice.amount_usd) * rateCtx.active_bs_per_usd
                        ).toLocaleString('es-VE', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        Bs{' '}
                        <span className="text-text-muted text-[11px]">
                          ({rateCtx.active_label})
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="border-border/60 divide-border/50 bg-surface-raised/20 divide-y overflow-hidden rounded-xl border text-xs">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-text-muted font-medium">Concepto / Detalle</span>
                    <span className="text-text font-semibold">{selectedInvoice.title}</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-text-muted font-medium">Estado actual</span>
                    <span className="text-text flex items-center gap-1.5 font-medium">
                      {selectedInvoice.status === 'confirmed' && (
                        <CheckCircle2 className="text-success h-3.5 w-3.5" />
                      )}
                      {selectedInvoice.status === 'pending' && selectedInvoice.reference && (
                        <Clock className="text-brand h-3.5 w-3.5" />
                      )}
                      {selectedInvoice.status === 'pending' && !selectedInvoice.reference && (
                        <Clock className="text-warning h-3.5 w-3.5" />
                      )}
                      {(selectedInvoice.status === 'rejected' ||
                        selectedInvoice.status === 'cancelled') && (
                        <XCircle className="text-danger h-3.5 w-3.5" />
                      )}
                      {statusLabel(selectedInvoice.status, Boolean(selectedInvoice.reference))}
                    </span>
                  </div>
                  {selectedInvoice.reference ? (
                    <div className="bg-brand/5 flex items-center justify-between p-3">
                      <span className="text-brand font-semibold">Nº Referencia / Pago</span>
                      <span className="text-text font-mono font-bold tracking-wider">
                        {selectedInvoice.reference}
                      </span>
                    </div>
                  ) : null}
                  {selectedInvoice.rejection_reason ? (
                    <div className="bg-danger/5 p-3">
                      <span className="text-danger mb-0.5 block font-semibold">
                        Motivo de rechazo:
                      </span>
                      <span className="text-text-secondary">
                        {selectedInvoice.rejection_reason}
                      </span>
                    </div>
                  ) : null}
                  {selectedInvoice.created_at ? (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-text-muted font-medium">Fecha de emisión</span>
                      <span className="text-text-muted">
                        {new Date(selectedInvoice.created_at).toLocaleDateString('es-VE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2 pt-1">
                  {selectedInvoice.status === 'pending' && selectedInvoice.reference ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="md"
                        className="bg-success hover:bg-success/90 shadow-success/20 gap-1.5 text-white shadow-md"
                        onClick={() => onConfirmInvoice(selectedInvoice)}
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        Confirmar
                      </Button>
                      <Button
                        type="button"
                        size="md"
                        variant="danger"
                        className="gap-1.5"
                        onClick={() => onOpenRejectModal(selectedInvoice)}
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                        Rechazar
                      </Button>
                    </div>
                  ) : null}

                  {selectedInvoice.status === 'pending' && !selectedInvoice.reference ? (
                    <Button
                      type="button"
                      size="md"
                      variant="secondary"
                      className="text-danger hover:bg-danger/10 w-full gap-1.5"
                      onClick={() => onCancelInvoice(selectedInvoice)}
                    >
                      <X className="h-4 w-4" />
                      Cancelar este cobro
                    </Button>
                  ) : null}

                  {selectedInvoice.status === 'confirmed' ? (
                    <div className="border-success/30 bg-success/10 text-success flex items-center justify-center gap-2 rounded-xl p-3 text-center text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Cobro confirmado y acreditado
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              /* Empty selection dossier state */
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-brand/10 text-brand mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h4 className="text-text text-sm font-semibold">Selecciona un cobro</h4>
                <p className="text-text-muted mt-1 max-w-xs text-xs">
                  Haz clic en cualquier cobro de la lista para inspeccionar sus datos, verificar la
                  referencia o confirmar el pago.
                </p>
                <Button size="sm" className="mt-4 gap-1.5 shadow-sm" onClick={onOpenNewCharge}>
                  <Plus className="h-4 w-4" />
                  Crear nuevo cobro
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RATES & EXCHANGE RATE */}
        {currentTab === 'rates' && (
          <div className="space-y-5">
            {/* Rates list and creator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-text text-xs font-bold tracking-wider uppercase">
                  Mis Tarifas de Entrenamiento
                </h4>
                <Badge variant="outline" className="text-[10px]">
                  {offers.length} {offers.length === 1 ? 'tarifa' : 'tarifas'}
                </Badge>
              </div>

              {loadingOffers ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : offers.length === 0 ? (
                <div className="border-border/60 bg-surface-raised/30 text-text-muted rounded-xl border p-3 text-center text-xs">
                  No has registrado tarifas estándar aún.
                </div>
              ) : (
                <div className="border-border/60 divide-border/50 bg-surface-raised/30 divide-y overflow-hidden rounded-xl border">
                  {offers.map((o) => (
                    <div
                      key={o.id}
                      className="hover:bg-surface-raised/60 flex items-center justify-between gap-3 p-2.5 text-xs transition-colors"
                    >
                      <span
                        className={cn(
                          'truncate font-medium',
                          !o.active && 'text-text-muted line-through'
                        )}
                      >
                        {o.title}
                      </span>
                      <span className="text-brand shrink-0 font-bold tabular-nums">
                        ${o.price_usd} USD
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add offer inline card */}
              <div className="border-border/70 bg-surface-raised/40 space-y-2.5 rounded-xl border p-3">
                <p className="text-text text-xs font-semibold">Agregar nueva tarifa</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Ej. Sesión 1:1, Pack 10"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="Precio USD ($)"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs font-semibold"
                  disabled={!offerTitle.trim() || !offerPrice || isCreatingOffer}
                  loading={isCreatingOffer}
                  onClick={onCreateOffer}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Guardar Tarifa
                </Button>
              </div>
            </div>

            {/* Exchange Rate Preference */}
            <div className="border-border/70 bg-surface-raised/40 space-y-3 rounded-xl border p-3.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-brand h-4 w-4" />
                <h4 className="text-text text-xs font-bold tracking-wider uppercase">
                  Tasa de Cambio para Cobros en Bs
                </h4>
              </div>

              <div>
                <Label className="text-xs">Modalidad de tasa</Label>
                <Select
                  value={ratePref}
                  onChange={(e) => setRatePref(e.target.value as 'bcv' | 'euro')}
                  className="text-xs"
                >
                  <option value="bcv">Tasa Oficial BCV del Gym</option>
                  <option value="euro">Tasa Manual Personalizada</option>
                </Select>
              </div>

              {ratePref === 'euro' ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Bs por 1 USD</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={euroRate}
                      onChange={(e) => setEuroRate(e.target.value)}
                      placeholder="Ej. 85.50"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nota de referencia (opcional)</Label>
                    <Input
                      value={euroNote}
                      onChange={(e) => setEuroNote(e.target.value)}
                      placeholder="Ej. Tasa Paralelo / Promedio"
                      className="text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-border/50 bg-surface/80 rounded-lg border p-2.5">
                  <p className="text-text-secondary text-xs">
                    {rateCtx?.bcv_bs_per_usd ? (
                      <>
                        Tasa BCV vigente del sistema:{' '}
                        <strong className="text-text font-bold">
                          {rateCtx.bcv_bs_per_usd.toLocaleString('es-VE')} Bs / USD
                        </strong>
                      </>
                    ) : (
                      'Tasa BCV sincronizada automáticamente por administración'
                    )}
                  </p>
                </div>
              )}

              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs font-semibold"
                loading={isSavingRate}
                onClick={onSaveRate}
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                Guardar Preferencia de Tasa
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT DESTINATIONS */}
        {currentTab === 'destinations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-text text-xs font-bold tracking-wider uppercase">
                  Cuentas Receptoras
                </h4>
                <p className="text-text-muted text-xs">
                  Estos datos se mostrarán a tus alumnos cuando vayan a pagar.
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                loading={isSavingDest}
                onClick={onSaveDest}
                className="gap-1 shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                Guardar
              </Button>
            </div>

            <div className="space-y-3">
              {/* Pago Móvil */}
              <div className="border-border/60 bg-surface-raised/40 space-y-2.5 rounded-xl border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    className="accent-brand size-3.5 rounded"
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
                {destForm.pago_movil.enabled && (
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    <Input
                      placeholder="Teléfono (ej. 04141234567)"
                      value={destForm.pago_movil.phone}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          pago_movil: { ...f.pago_movil, phone: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Cédula (ej. V-12345678)"
                      value={destForm.pago_movil.holder_cedula}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          pago_movil: { ...f.pago_movil, holder_cedula: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Banco receptor (ej. Banesco, Mercantil)"
                      value={destForm.pago_movil.bank_name}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          pago_movil: { ...f.pago_movil, bank_name: e.target.value },
                        }))
                      }
                      className="text-xs sm:col-span-2"
                    />
                  </div>
                )}
              </div>

              {/* Transferencia Bancaria */}
              <div className="border-border/60 bg-surface-raised/40 space-y-2.5 rounded-xl border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    className="accent-brand size-3.5 rounded"
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
                {destForm.transferencia.enabled && (
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    <Input
                      placeholder="Nombre del titular"
                      value={destForm.transferencia.holder_name}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          transferencia: { ...f.transferencia, holder_name: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Cédula del titular"
                      value={destForm.transferencia.holder_cedula}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          transferencia: { ...f.transferencia, holder_cedula: e.target.value },
                        }))
                      }
                      className="text-xs"
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
                      className="text-xs"
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
                      className="text-xs"
                    >
                      <option value="">Tipo de cuenta…</option>
                      <option value="corriente">Corriente</option>
                      <option value="ahorro">Ahorro</option>
                    </Select>
                    <Input
                      placeholder="Número de cuenta (20 dígitos)"
                      value={destForm.transferencia.account_number}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          transferencia: { ...f.transferencia, account_number: e.target.value },
                        }))
                      }
                      className="text-xs sm:col-span-2"
                    />
                  </div>
                )}
              </div>

              {/* Zelle */}
              <div className="border-border/60 bg-surface-raised/40 space-y-2.5 rounded-xl border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    className="accent-brand size-3.5 rounded"
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
                {destForm.zelle.enabled && (
                  <Input
                    placeholder="Correo o teléfono Zelle"
                    value={destForm.zelle.email}
                    onChange={(e) =>
                      setDestForm((f) => ({
                        ...f,
                        zelle: { ...f.zelle, email: e.target.value },
                      }))
                    }
                    className="mt-1 text-xs"
                  />
                )}
              </div>

              {/* USDT / Binance */}
              <div className="border-border/60 bg-surface-raised/40 space-y-2.5 rounded-xl border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    className="accent-brand size-3.5 rounded"
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
                {destForm.usdt.enabled && (
                  <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    <Input
                      placeholder="Correo Binance Pay"
                      value={destForm.usdt.binance_email}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          usdt: { ...f.usdt, binance_email: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Binance ID (Pay ID)"
                      value={destForm.usdt.binance_id}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          usdt: { ...f.usdt, binance_id: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                    <Input
                      placeholder="Red / Token (ej. USDT TRC20)"
                      value={destForm.usdt.network}
                      onChange={(e) =>
                        setDestForm((f) => ({
                          ...f,
                          usdt: { ...f.usdt, network: e.target.value },
                        }))
                      }
                      className="text-xs sm:col-span-2"
                    />
                  </div>
                )}
              </div>

              {/* Efectivo USD */}
              <div className="border-border/60 bg-surface-raised/40 space-y-2.5 rounded-xl border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    className="accent-brand size-3.5 rounded"
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
                {destForm.efectivo_usd.enabled && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DEFAULT_USD_DENOMINATIONS.map((d) => (
                      <label
                        key={d}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all',
                          destForm.efectivo_usd.denominations.includes(d)
                            ? 'border-brand bg-brand/10 text-brand font-semibold'
                            : 'border-border text-text-muted hover:border-border/80'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
