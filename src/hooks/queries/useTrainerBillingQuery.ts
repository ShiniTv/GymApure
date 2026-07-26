import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { PaymentDestinations } from '../../lib/paymentDestinationsCore';

export interface TrainerOffer {
  id: number;
  title: string;
  billing_unit: 'session' | 'package' | 'month';
  price_usd: number;
  sessions_included: number | null;
  active: boolean;
  created_at: string;
}

export interface TrainerInvoice {
  id: number;
  trainer_id: number;
  member_id: number;
  member_name?: string;
  trainer_name?: string;
  offer_id: number | null;
  appointment_id: number | null;
  title: string;
  amount_usd: number;
  method: string | null;
  reference: string | null;
  proof_url: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface TrainerBillingMember {
  id: number;
  full_name: string;
  cedula: string | null;
}

const rootKey = ['trainer-billing'] as const;

export function useTrainerOffersQuery(enabled = true) {
  return useQuery({
    queryKey: [...rootKey, 'offers'],
    queryFn: async () => {
      const res = await apiFetch('/api/trainer-billing/offers');
      return parseJsonResponse<TrainerOffer[]>(res);
    },
    enabled,
  });
}

export function useTrainerBillingMembersQuery(enabled = true) {
  return useQuery({
    queryKey: [...rootKey, 'members'],
    queryFn: async () => {
      const res = await apiFetch('/api/trainer-billing/members');
      return parseJsonResponse<TrainerBillingMember[]>(res);
    },
    enabled,
  });
}

export function useTrainerInvoicesQuery(enabled = true) {
  return useQuery({
    queryKey: [...rootKey, 'invoices'],
    queryFn: async () => {
      const res = await apiFetch('/api/trainer-billing/invoices');
      return parseJsonResponse<TrainerInvoice[]>(res);
    },
    enabled,
  });
}

export function useTrainerDestinationsQuery(enabled = true) {
  return useQuery({
    queryKey: [...rootKey, 'destinations', 'mine'],
    queryFn: async () => {
      const res = await apiFetch('/api/trainer-billing/destinations');
      return parseJsonResponse<PaymentDestinations>(res);
    },
    enabled,
  });
}

export function useTrainerDestinationsForMemberQuery(trainerId: number | null, enabled = true) {
  return useQuery({
    queryKey: [...rootKey, 'destinations', trainerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/trainer-billing/destinations/${trainerId}`);
      return parseJsonResponse<PaymentDestinations>(res);
    },
    enabled: enabled && trainerId != null,
  });
}

export function useCreateTrainerInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      member_id: number;
      title: string;
      amount_usd: number;
      offer_id?: number | null;
    }) => {
      const res = await apiFetch('/api/trainer-billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<TrainerInvoice & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear el cobro');
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...rootKey, 'invoices'] }),
  });
}

export function useCreateTrainerOfferMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      price_usd: number;
      billing_unit?: 'session' | 'package' | 'month';
      sessions_included?: number | null;
    }) => {
      const res = await apiFetch('/api/trainer-billing/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<TrainerOffer & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear la oferta');
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...rootKey, 'offers'] }),
  });
}

export function useUpdateTrainerDestinationsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PaymentDestinations) => {
      const res = await apiFetch('/api/trainer-billing/destinations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<PaymentDestinations & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar');
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([...rootKey, 'destinations', 'mine'], data);
    },
  });
}

export function useConfirmTrainerInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/trainer-billing/invoices/${id}/confirm`, { method: 'POST' });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo confirmar');
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...rootKey, 'invoices'] }),
  });
}

export function useRejectTrainerInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiFetch(`/api/trainer-billing/invoices/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo rechazar');
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...rootKey, 'invoices'] }),
  });
}

export function useReportTrainerInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      method,
      reference,
      proof,
    }: {
      id: number;
      method: string;
      reference: string;
      proof?: File | null;
    }) => {
      const form = new FormData();
      form.append('method', method);
      form.append('reference', reference);
      if (proof) form.append('proof', proof);
      const res = await apiFetch(`/api/trainer-billing/invoices/${id}/report`, {
        method: 'POST',
        body: form,
      });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo reportar');
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...rootKey, 'invoices'] }),
  });
}
