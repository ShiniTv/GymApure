import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { NotificationsListResponse } from '../../lib/notifications/types';

export const notificationsUnreadKey = ['notifications', 'unread'] as const;
export const notificationsListKey = (page: number, unreadOnly: boolean) =>
  ['notifications', 'list', page, unreadOnly] as const;
export const notificationsPanelKey = ['notifications', 'panel'] as const;

async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch('/api/notifications/unread-count');
  const data = await parseJsonResponse<{ count: number }>(res);
  return data.count;
}

async function fetchNotifications(
  page: number,
  limit: number,
  unreadOnly: boolean
): Promise<NotificationsListResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(unreadOnly ? { unread_only: 'true' } : {}),
  });
  const res = await apiFetch(`/api/notifications?${qs.toString()}`);
  return parseJsonResponse<NotificationsListResponse>(res);
}

export function useNotificationUnreadQuery(enabled = true) {
  return useQuery({
    queryKey: notificationsUnreadKey,
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: 30_000,
  });
}

export function useNotificationsPanelQuery(enabled = true) {
  return useQuery({
    queryKey: notificationsPanelKey,
    queryFn: () => fetchNotifications(1, 10, true),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useNotificationsQuery(page: number, unreadOnly: boolean, enabled = true) {
  return useQuery({
    queryKey: notificationsListKey(page, unreadOnly),
    queryFn: () => fetchNotifications(page, 20, unreadOnly),
    enabled,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await parseJsonResponse<{ error?: string }>(res);
        throw new Error(data.error ?? 'No se pudo marcar la notificación');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) {
        const data = await parseJsonResponse<{ error?: string }>(res);
        throw new Error(data.error ?? 'No se pudieron marcar las notificaciones');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
