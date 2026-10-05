import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../../lib/api';
import type { NotificationsListResponse } from '../../lib/notifications/types';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export const notificationsUnreadKey = ['notifications', 'unread'] as const;
export const notificationsListKey = (page: number, unreadOnly: boolean) =>
  ['notifications', 'list', page, unreadOnly] as const;
export const notificationsPanelKey = ['notifications', 'panel'] as const;

async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch('/api/notifications/unread-count');
  if (res.status === 401) return 0;
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
  if (res.status === 401) {
    return { items: [], total: 0, page, limit, unread_count: 0 };
  }
  return parseJsonResponse<NotificationsListResponse>(res);
}

export function useNotificationUnreadQuery(enabled = true) {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  return useQuery({
    queryKey: notificationsUnreadKey,
    queryFn: fetchUnreadCount,
    enabled: enabled && !!user,
    refetchInterval: isConnected ? false : 30_000,
  });
}

export function useNotificationsPanelQuery(enabled = true) {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  return useQuery({
    queryKey: notificationsPanelKey,
    queryFn: () => fetchNotifications(1, 10, true),
    enabled: enabled && !!user,
    refetchInterval: isConnected ? false : 30_000,
  });
}

export function useNotificationsQuery(page: number, unreadOnly: boolean, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: notificationsListKey(page, unreadOnly),
    queryFn: () => fetchNotifications(page, 20, unreadOnly),
    enabled: enabled && !!user,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data?.error ?? 'No se pudo marcar la notificación');
      }
    },
    onMutate: async (notificationId: number) => {
      // Optimistic instant update for UI responsiveness
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      // Decrement unread count
      queryClient.setQueryData<number>(notificationsUnreadKey, (old) =>
        Math.max(0, (old ?? 1) - 1)
      );

      // Optimistically update panel data
      queryClient.setQueryData<NotificationsListResponse>(notificationsPanelKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          unread_count: Math.max(0, old.unread_count - 1),
          items: old.items.map((i) =>
            i.id === notificationId ? { ...i, read_at: new Date().toISOString() } : i
          ),
        };
      });
    },
    onSettled: () => {
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
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data?.error ?? 'No se pudieron marcar las notificaciones');
      }
    },
    onMutate: async () => {
      // Optimistic instant clear
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueryData<number>(notificationsUnreadKey, 0);
      queryClient.setQueryData<NotificationsListResponse>(notificationsPanelKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          unread_count: 0,
          items: old.items.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })),
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
