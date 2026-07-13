import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface ExchangeRate {
  currency: 'USD';
  rate: number;
  effective_date: string;
  source: 'bcv' | 'manual';
  fetched_at: string;
}

export const exchangeRateQueryKey = ['exchange-rate'] as const;

async function fetchExchangeRate(): Promise<ExchangeRate> {
  const res = await apiFetch('/api/exchange-rate');
  const data = await parseJsonResponse<ExchangeRate & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error ?? 'No se pudo cargar la tasa de cambio');
  }
  return data;
}

export function useExchangeRateQuery(enabled = true) {
  return useQuery({
    queryKey: exchangeRateQueryKey,
    queryFn: fetchExchangeRate,
    enabled,
    staleTime: 5 * 60_000,
    retry: 2,
  });
}

export function formatBsRateLabel(rate: ExchangeRate): string {
  const formattedRate = rate.rate.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const [year, month, day] = rate.effective_date.split('-');
  const sourceLabel = rate.source === 'manual' ? 'manual' : 'BCV';
  return `${formattedRate} Bs/USD (${sourceLabel}, ${day}/${month}/${year})`;
}
