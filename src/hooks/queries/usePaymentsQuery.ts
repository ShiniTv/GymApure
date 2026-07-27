import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import {
  applyOptimisticUpdate,
  rollbackOptimistic,
  type OptimisticContext,
} from '../../lib/optimisticMutation';

export interface Payment {
  id: number;
  user_name: string;
  amount_usd: number;
  amount_bs: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reference: string;
  proof_url?: string | null;
  rejection_reason?: string | null;
}

export interface PaginatedPayments {
  items: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaymentsQueryParams {
  page: number;
  pageSize: number;
  statusFilter: string;
  search?: string;
}

export function paymentsQueryKey(params: PaymentsQueryParams) {
  return ['payments', params] as const;
}

async function fetchPayments(params: PaymentsQueryParams): Promise<PaginatedPayments> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.pageSize),
  });
  if (params.statusFilter) qs.set('status', params.statusFilter);
  if (params.search) qs.set('q', params.search);

  const res = await apiFetch(`/api/payments?${qs.toString()}`);
  return parseJsonResponse<PaginatedPayments>(res);
}

export function usePaymentsQuery(params: PaymentsQueryParams) {
  return useQuery({
    queryKey: paymentsQueryKey(params),
    queryFn: () => fetchPayments(params),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useInvalidatePayments() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['payments'] });
}

interface ReviewPaymentVariables {
  paymentId: number;
  status: 'approved' | 'rejected';
  membershipId?: number;
  reason?: string;
}

export function useReviewPaymentMutation(params: PaymentsQueryParams) {
  const queryClient = useQueryClient();
  const queryKey = paymentsQueryKey(params);

  return useMutation<unknown, Error, ReviewPaymentVariables, OptimisticContext<PaginatedPayments>>({
    mutationFn: async ({ paymentId, status, membershipId, reason }) => {
      const endpoint = status === 'approved' ? 'approve' : 'reject';
      const body = status === 'approved' ? { membership_id: membershipId } : { reason };
      const res = await apiFetch(`/api/payments/${paymentId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return parseJsonResponse(res);
    },
    onMutate: ({ paymentId, status, reason }) =>
      applyOptimisticUpdate<PaginatedPayments>(queryClient, queryKey, (previous) => {
        const fallback: PaginatedPayments = {
          items: [],
          total: 0,
          page: params.page,
          pageSize: params.pageSize,
        };
        const current = previous ?? fallback;
        if (params.statusFilter && params.statusFilter !== status) {
          const items = current.items.filter((payment) => payment.id !== paymentId);
          return {
            ...current,
            items,
            total: Math.max(0, current.total - (items.length === current.items.length ? 0 : 1)),
          };
        }
        return {
          ...current,
          items: current.items.map((payment) =>
            payment.id === paymentId
              ? {
                  ...payment,
                  status,
                  rejection_reason: status === 'rejected' ? (reason ?? null) : null,
                }
              : payment
          ),
        };
      }),
    onError: (_error, _variables, context) => {
      rollbackOptimistic(queryClient, context);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
}
