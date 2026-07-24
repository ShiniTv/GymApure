import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface Payment {
  id: number;
  user_name: string;
  amount_usd: number;
  amount_bs: number | null;
  exchange_rate: number | null;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reference: string;
  proof_url?: string | null;
  rejection_reason?: string | null;
}

interface PaginatedPayments {
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
