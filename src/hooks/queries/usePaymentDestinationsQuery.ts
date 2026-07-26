import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { PaymentDestinations } from '../../lib/paymentDestinationsCore';

export const paymentDestinationsKey = ['settings', 'payment-destinations'] as const;

async function fetchPaymentDestinations(): Promise<PaymentDestinations> {
  const res = await apiFetch('/api/settings/payment-destinations');
  return parseJsonResponse<PaymentDestinations>(res);
}

export function usePaymentDestinationsQuery(enabled = true) {
  return useQuery({
    queryKey: paymentDestinationsKey,
    queryFn: fetchPaymentDestinations,
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdatePaymentDestinationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PaymentDestinations) => {
      const res = await apiFetch('/api/settings/payment-destinations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<PaymentDestinations & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(paymentDestinationsKey, data);
    },
  });
}
