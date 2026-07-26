import { useEffect, useState } from 'react';
import { Landmark, Save } from 'lucide-react';
import {
  DEFAULT_USD_DENOMINATIONS,
  defaultPaymentDestinations,
  PAYMENT_METHOD_LABELS,
  type PaymentDestinations,
} from '../../lib/paymentDestinationsCore';
import {
  usePaymentDestinationsQuery,
  useUpdatePaymentDestinationsMutation,
} from '../../hooks/queries/usePaymentDestinationsQuery';
import { toDisplayErrorMessage } from '../../lib/api';
import { Button, Card, Input, Label, Select, Skeleton } from '../ui';

interface PaymentDestinationsSettingsCardProps {
  saving?: boolean;
  onMessage?: (tone: 'success' | 'error' | 'info', message: string) => void;
}

export function PaymentDestinationsSettingsCard({
  onMessage,
}: PaymentDestinationsSettingsCardProps) {
  const { data, isPending, isError } = usePaymentDestinationsQuery(true);
  const updateMutation = useUpdatePaymentDestinationsMutation();
  const [form, setForm] = useState<PaymentDestinations>(defaultPaymentDestinations());

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    try {
      await updateMutation.mutateAsync(form);
      onMessage?.('success', 'Datos de cobro guardados');
    } catch (err) {
      onMessage?.('error', toDisplayErrorMessage(err, 'Error al guardar datos de cobro'));
    }
  };

  if (isPending) {
    return (
      <Card padding="sm" rounded="xl" className="min-w-0 overflow-hidden md:p-4">
        <Skeleton className="mb-3 h-4 w-48" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (isError && !data) {
    return (
      <Card padding="sm" rounded="xl" className="min-w-0 overflow-hidden md:p-4">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudieron cargar los datos de cobro.
        </p>
      </Card>
    );
  }

  return (
    <Card
      id="datos-cobro"
      padding="sm"
      rounded="xl"
      className="min-w-0 scroll-mt-20 overflow-hidden md:p-4"
    >
      <div className="mb-2.5 flex min-w-0 items-center gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <Landmark className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Datos de cobro</span>
        </h2>
        <Button
          type="button"
          size="sm"
          className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
          onClick={() => void save()}
          disabled={updateMutation.isPending}
          aria-label="Guardar datos de cobro"
          title="Guardar"
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <p className="mb-4 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
        Datos que verá el miembro al reportar el pago de su membresía, según el método elegido.
      </p>

      <div className="space-y-5">
        {/* Pago móvil */}
        <section className="border-border space-y-2.5 border-t pt-4 first:border-t-0 first:pt-0">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.pago_movil.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  pago_movil: { ...f.pago_movil, enabled: e.target.checked },
                }))
              }
            />
            {PAYMENT_METHOD_LABELS.pago_movil}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <Label className="text-[11px]">Teléfono</Label>
              <Input
                value={form.pago_movil.phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pago_movil: { ...f.pago_movil, phone: e.target.value },
                  }))
                }
                placeholder="0412…"
              />
            </div>
            <div>
              <Label className="text-[11px]">Cédula</Label>
              <Input
                value={form.pago_movil.holder_cedula}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pago_movil: { ...f.pago_movil, holder_cedula: e.target.value },
                  }))
                }
                placeholder="V-12345678"
              />
            </div>
            <div>
              <Label className="text-[11px]">Banco</Label>
              <Input
                value={form.pago_movil.bank_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pago_movil: { ...f.pago_movil, bank_name: e.target.value },
                  }))
                }
                placeholder="Banesco, BDV…"
              />
            </div>
          </div>
        </section>

        {/* Transferencia */}
        <section className="border-border space-y-2.5 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.transferencia.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  transferencia: { ...f.transferencia, enabled: e.target.checked },
                }))
              }
            />
            {PAYMENT_METHOD_LABELS.transferencia}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[11px]">Nombre y apellido</Label>
              <Input
                value={form.transferencia.holder_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transferencia: { ...f.transferencia, holder_name: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">Cédula</Label>
              <Input
                value={form.transferencia.holder_cedula}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transferencia: { ...f.transferencia, holder_cedula: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">Banco</Label>
              <Input
                value={form.transferencia.bank_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transferencia: { ...f.transferencia, bank_name: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">Tipo de cuenta</Label>
              <Select
                value={form.transferencia.account_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transferencia: {
                      ...f.transferencia,
                      account_type: e.target.value as 'corriente' | 'ahorro' | '',
                    },
                  }))
                }
              >
                <option value="">Seleccionar…</option>
                <option value="corriente">Corriente</option>
                <option value="ahorro">Ahorro</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px]">Número de cuenta</Label>
              <Input
                value={form.transferencia.account_number}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    transferencia: { ...f.transferencia, account_number: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </section>

        {/* Zelle */}
        <section className="border-border space-y-2.5 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.zelle.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  zelle: { ...f.zelle, enabled: e.target.checked },
                }))
              }
            />
            {PAYMENT_METHOD_LABELS.zelle}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[11px]">Correo Zelle</Label>
              <Input
                type="email"
                value={form.zelle.email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    zelle: { ...f.zelle, email: e.target.value },
                  }))
                }
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <Label className="text-[11px]">Nombre (opcional)</Label>
              <Input
                value={form.zelle.holder_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    zelle: { ...f.zelle, holder_name: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </section>

        {/* USDT Binance */}
        <section className="border-border space-y-2.5 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.usdt.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  usdt: { ...f.usdt, enabled: e.target.checked },
                }))
              }
            />
            {PAYMENT_METHOD_LABELS.usdt}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[11px]">Correo Binance</Label>
              <Input
                type="email"
                value={form.usdt.binance_email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    usdt: { ...f.usdt, binance_email: e.target.value },
                  }))
                }
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <Label className="text-[11px]">Binance ID</Label>
              <Input
                value={form.usdt.binance_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    usdt: { ...f.usdt, binance_id: e.target.value },
                  }))
                }
                placeholder="UID numérico"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px]">Red / activo</Label>
              <Input
                value={form.usdt.network}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    usdt: { ...f.usdt, network: e.target.value },
                  }))
                }
                placeholder="USDT · TRC20"
              />
            </div>
          </div>
        </section>

        {/* Divisas */}
        <section className="border-border space-y-2.5 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.efectivo_usd.enabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  efectivo_usd: { ...f.efectivo_usd, enabled: e.target.checked },
                }))
              }
            />
            {PAYMENT_METHOD_LABELS.efectivo_usd}
          </label>
          <p className="text-text-muted text-[11px]">
            Denominaciones que el miembro podrá contabilizar al reportar efectivo USD.
          </p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_USD_DENOMINATIONS.map((denom) => {
              const checked = form.efectivo_usd.denominations.includes(denom);
              return (
                <label
                  key={denom}
                  className="border-border bg-surface rounded-pill inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setForm((f) => {
                        const set = new Set(f.efectivo_usd.denominations);
                        if (e.target.checked) set.add(denom);
                        else set.delete(denom);
                        const next = [...set].sort((a, b) => a - b);
                        return {
                          ...f,
                          efectivo_usd: {
                            ...f.efectivo_usd,
                            denominations: next.length ? next : [denom],
                          },
                        };
                      });
                    }}
                  />
                  ${denom}
                </label>
              );
            })}
          </div>
          <div>
            <Label className="text-[11px]">Notas (opcional)</Label>
            <Input
              value={form.efectivo_usd.notes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  efectivo_usd: { ...f.efectivo_usd, notes: e.target.value },
                }))
              }
              placeholder="Ej. Solo billetes en buen estado"
            />
          </div>
        </section>
      </div>
    </Card>
  );
}
