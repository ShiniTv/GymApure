export const PAYMENT_DESTINATION_KEY = 'payment_destinations';

export const PAYMENT_METHOD_KEYS = [
  'pago_movil',
  'transferencia',
  'zelle',
  'usdt',
  'efectivo_usd',
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  pago_movil: 'Pago móvil',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  usdt: 'USDT (Binance)',
  efectivo_usd: 'Divisas (efectivo USD)',
};

/** Common USD bill denominations for cash counting. */
export const DEFAULT_USD_DENOMINATIONS = [1, 5, 10, 20, 50, 100] as const;

export interface PagoMovilDestination {
  enabled: boolean;
  phone: string;
  bank_name: string;
  holder_cedula: string;
  notes: string;
}

export interface TransferenciaDestination {
  enabled: boolean;
  bank_name: string;
  account_number: string;
  account_type: 'corriente' | 'ahorro' | '';
  holder_name: string;
  holder_cedula: string;
  notes: string;
}

export interface ZelleDestination {
  enabled: boolean;
  email: string;
  holder_name: string;
  notes: string;
}

export interface UsdtDestination {
  enabled: boolean;
  /** Binance account email and/or numeric UID — at least one when enabled */
  binance_email: string;
  binance_id: string;
  /** e.g. TRC20 / network note for the payer */
  network: string;
  notes: string;
}

export interface EfectivoUsdDestination {
  enabled: boolean;
  /** Denominations the gym accepts / wants counted */
  denominations: number[];
  notes: string;
}

export interface PaymentDestinations {
  pago_movil: PagoMovilDestination;
  transferencia: TransferenciaDestination;
  zelle: ZelleDestination;
  usdt: UsdtDestination;
  efectivo_usd: EfectivoUsdDestination;
}

const emptyMovil = (): PagoMovilDestination => ({
  enabled: false,
  phone: '',
  bank_name: '',
  holder_cedula: '',
  notes: '',
});

const emptyTransfer = (): TransferenciaDestination => ({
  enabled: false,
  bank_name: '',
  account_number: '',
  account_type: '',
  holder_name: '',
  holder_cedula: '',
  notes: '',
});

const emptyZelle = (): ZelleDestination => ({
  enabled: false,
  email: '',
  holder_name: '',
  notes: '',
});

const emptyUsdt = (): UsdtDestination => ({
  enabled: false,
  binance_email: '',
  binance_id: '',
  network: 'USDT',
  notes: '',
});

const emptyEfectivo = (): EfectivoUsdDestination => ({
  enabled: false,
  denominations: [...DEFAULT_USD_DENOMINATIONS],
  notes: '',
});

export function defaultPaymentDestinations(): PaymentDestinations {
  return {
    pago_movil: emptyMovil(),
    transferencia: emptyTransfer(),
    zelle: emptyZelle(),
    usdt: emptyUsdt(),
    efectivo_usd: emptyEfectivo(),
  };
}

function asString(value: unknown, max = 120): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseDenominations(raw: unknown): number[] {
  const allowed = new Set<number>(DEFAULT_USD_DENOMINATIONS);
  if (!Array.isArray(raw)) return [...DEFAULT_USD_DENOMINATIONS];
  const nums = raw
    .map((n) => (typeof n === 'number' ? n : Number(n)))
    .filter((n) => Number.isFinite(n) && allowed.has(n));
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [...DEFAULT_USD_DENOMINATIONS];
}

export function normalizePaymentDestinations(raw: unknown): PaymentDestinations {
  const base = defaultPaymentDestinations();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;

  const movil = (obj.pago_movil ?? {}) as Record<string, unknown>;
  base.pago_movil = {
    enabled: asBool(movil.enabled),
    phone: asString(movil.phone, 20),
    bank_name: asString(movil.bank_name, 80),
    holder_cedula: asString(movil.holder_cedula, 20),
    notes: asString(movil.notes, 300),
  };

  const transfer = (obj.transferencia ?? {}) as Record<string, unknown>;
  const accountType = asString(transfer.account_type, 20);
  base.transferencia = {
    enabled: asBool(transfer.enabled),
    bank_name: asString(transfer.bank_name, 80),
    account_number: asString(transfer.account_number, 40),
    account_type: accountType === 'corriente' || accountType === 'ahorro' ? accountType : '',
    holder_name: asString(transfer.holder_name, 120),
    holder_cedula: asString(transfer.holder_cedula, 20),
    notes: asString(transfer.notes, 300),
  };

  const zelle = (obj.zelle ?? {}) as Record<string, unknown>;
  base.zelle = {
    enabled: asBool(zelle.enabled),
    email: asString(zelle.email, 120),
    holder_name: asString(zelle.holder_name, 120),
    notes: asString(zelle.notes, 300),
  };

  const usdt = (obj.usdt ?? {}) as Record<string, unknown>;
  base.usdt = {
    enabled: asBool(usdt.enabled),
    binance_email: asString(usdt.binance_email, 120),
    binance_id: asString(usdt.binance_id, 40),
    network: asString(usdt.network, 40) || 'USDT',
    notes: asString(usdt.notes, 300),
  };

  const cash = (obj.efectivo_usd ?? {}) as Record<string, unknown>;
  base.efectivo_usd = {
    enabled: asBool(cash.enabled),
    denominations: parseDenominations(cash.denominations),
    notes: asString(cash.notes, 300),
  };

  return base;
}

/** Human-readable lines for UI / copy-to-clipboard. */
export function formatDestinationLines(
  method: PaymentMethodKey,
  destinations: PaymentDestinations
): string[] {
  const lines: string[] = [];
  if (method === 'pago_movil') {
    const d = destinations.pago_movil;
    if (!d.enabled) return lines;
    if (d.phone) lines.push(`Teléfono: ${d.phone}`);
    if (d.holder_cedula) lines.push(`Cédula: ${d.holder_cedula}`);
    if (d.bank_name) lines.push(`Banco: ${d.bank_name}`);
    if (d.notes) lines.push(d.notes);
    return lines;
  }
  if (method === 'transferencia') {
    const d = destinations.transferencia;
    if (!d.enabled) return lines;
    if (d.holder_name) lines.push(`Titular: ${d.holder_name}`);
    if (d.holder_cedula) lines.push(`Cédula: ${d.holder_cedula}`);
    if (d.bank_name) lines.push(`Banco: ${d.bank_name}`);
    if (d.account_type) {
      lines.push(`Tipo de cuenta: ${d.account_type === 'ahorro' ? 'Ahorro' : 'Corriente'}`);
    }
    if (d.account_number) lines.push(`Número de cuenta: ${d.account_number}`);
    if (d.notes) lines.push(d.notes);
    return lines;
  }
  if (method === 'zelle') {
    const d = destinations.zelle;
    if (!d.enabled) return lines;
    if (d.email) lines.push(`Correo Zelle: ${d.email}`);
    if (d.holder_name) lines.push(`Nombre: ${d.holder_name}`);
    if (d.notes) lines.push(d.notes);
    return lines;
  }
  if (method === 'usdt') {
    const d = destinations.usdt;
    if (!d.enabled) return lines;
    if (d.binance_email) lines.push(`Binance (correo): ${d.binance_email}`);
    if (d.binance_id) lines.push(`Binance ID: ${d.binance_id}`);
    if (d.network) lines.push(`Red / activo: ${d.network}`);
    if (d.notes) lines.push(d.notes);
    return lines;
  }
  const d = destinations.efectivo_usd;
  if (!d.enabled) return lines;
  if (d.denominations.length) {
    lines.push(`Denominaciones: ${d.denominations.map((n) => `$${n}`).join(', ')}`);
  }
  if (d.notes) lines.push(d.notes);
  return lines;
}

export function formatDenominationBreakdown(counts: Record<number, number>): {
  total: number;
  label: string;
} {
  const parts: string[] = [];
  let total = 0;
  for (const denom of Object.keys(counts)
    .map(Number)
    .sort((a, b) => b - a)) {
    const qty = Math.max(0, Math.floor(counts[denom] ?? 0));
    if (qty <= 0) continue;
    total += denom * qty;
    parts.push(`${qty}×$${denom}`);
  }
  return { total, label: parts.join(' + ') };
}
