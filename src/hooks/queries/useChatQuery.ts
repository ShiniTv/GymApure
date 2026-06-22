import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface ChatConversationListItem {
  id: number;
  member_id: number;
  member_name: string;
  member_cedula: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_kind: 'text' | 'system' | null;
  unread_count: number;
  days_remaining: number | null;
  membership_name: string | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_role: string | null;
  body: string;
  kind: 'text' | 'system';
  event_type: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
  is_mine: boolean;
}

export const chatUnreadKey = ['chat', 'unread'] as const;
export const chatConversationsKey = (search?: string, expiringOnly?: boolean) =>
  ['chat', 'conversations', search ?? '', expiringOnly ?? false] as const;
export const chatMessagesKey = (conversationId: number) => ['chat', 'messages', conversationId] as const;
export const chatMineKey = ['chat', 'mine'] as const;

async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch('/api/chat/unread-count');
  const data = await parseJsonResponse<{ count: number }>(res);
  return data.count;
}

async function fetchConversations(search?: string, expiringOnly?: boolean): Promise<ChatConversationListItem[]> {
  const qs = new URLSearchParams();
  if (search?.trim()) qs.set('q', search.trim());
  if (expiringOnly) qs.set('expiring', 'true');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiFetch(`/api/chat/conversations${suffix}`);
  const data = await parseJsonResponse<{ items: ChatConversationListItem[] }>(res);
  return data.items;
}

async function fetchMemberConversation(): Promise<ChatConversationListItem> {
  const res = await apiFetch('/api/chat/conversations/mine');
  return parseJsonResponse<ChatConversationListItem>(res);
}

async function fetchMessages(conversationId: number): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages`);
  return parseJsonResponse<{ messages: ChatMessage[]; hasMore: boolean }>(res);
}

async function openConversationWithMember(memberId: number): Promise<ChatConversationListItem> {
  const res = await apiFetch(`/api/chat/conversations/with/${memberId}`, { method: 'POST' });
  return parseJsonResponse<ChatConversationListItem>(res);
}

export function useChatUnreadQuery(enabled = true) {
  return useQuery({
    queryKey: chatUnreadKey,
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: 5000,
  });
}

export function useChatConversationsQuery(search?: string, expiringOnly?: boolean, enabled = true) {
  return useQuery({
    queryKey: chatConversationsKey(search, expiringOnly),
    queryFn: () => fetchConversations(search, expiringOnly),
    enabled,
    refetchInterval: 5000,
  });
}

export function useMemberChatQuery(enabled = true) {
  return useQuery({
    queryKey: chatMineKey,
    queryFn: fetchMemberConversation,
    enabled,
    refetchInterval: 5000,
  });
}

export function useChatMessagesQuery(conversationId: number | null, enabled = true) {
  return useQuery({
    queryKey: chatMessagesKey(conversationId ?? 0),
    queryFn: () => fetchMessages(conversationId!),
    enabled: enabled && conversationId != null,
    refetchInterval: 5000,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: number; body: string }) => {
      const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      return parseJsonResponse<ChatMessage>(res);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: chatMessagesKey(variables.conversationId) });
      void queryClient.invalidateQueries({ queryKey: chatUnreadKey });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: chatMineKey });
    },
  });
}

export function useMarkChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      const res = await apiFetch(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' });
      return parseJsonResponse<{ marked: number }>(res);
    },
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: chatMessagesKey(conversationId) });
      void queryClient.invalidateQueries({ queryKey: chatUnreadKey });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: chatMineKey });
    },
  });
}

export function useEditChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      body,
    }: {
      conversationId: number;
      messageId: number;
      body: string;
    }) => {
      const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      return parseJsonResponse<ChatMessage>(res);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: chatMessagesKey(variables.conversationId) });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: chatMineKey });
    },
  });
}

export function useDeleteChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
    }: {
      conversationId: number;
      messageId: number;
    }) => {
      const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      return parseJsonResponse<{ ok: boolean }>(res);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: chatMessagesKey(variables.conversationId) });
      void queryClient.invalidateQueries({ queryKey: chatUnreadKey });
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      void queryClient.invalidateQueries({ queryKey: chatMineKey });
    },
  });
}

export function useOpenChatWithMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: openConversationWithMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
}
