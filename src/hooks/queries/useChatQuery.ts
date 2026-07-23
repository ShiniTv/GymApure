import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';

const CHAT_POLL_CONNECTED_MS = 30_000;
const CHAT_POLL_DISCONNECTED_MS = 8_000;

function chatPollInterval(isConnected: boolean): number | false {
  return isConnected ? CHAT_POLL_CONNECTED_MS : CHAT_POLL_DISCONNECTED_MS;
}

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

export type ChatClientStatus = 'sending' | 'failed';

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
  /** Present only for optimistic / offline-failed client bubbles. */
  client_status?: ChatClientStatus;
}

export const chatUnreadKey = ['chat', 'unread'] as const;
export const chatConversationsKey = (
  search?: string,
  expiringOnly?: boolean,
  page?: number,
  pageSize?: number
) =>
  [
    'chat',
    'conversations',
    search ?? '',
    expiringOnly ?? false,
    page ?? 1,
    pageSize ?? 50,
  ] as const;

export const chatMessagesKey = (conversationId: number) =>
  ['chat', 'messages', conversationId] as const;
export const chatMineKey = ['chat', 'mine'] as const;

async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch('/api/chat/unread-count');
  const data = await parseJsonResponse<{ count: number }>(res);
  return data.count;
}

async function fetchConversations(
  search?: string,
  expiringOnly?: boolean,
  page = 1,
  pageSize = 50
): Promise<{
  items: ChatConversationListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const qs = new URLSearchParams();
  if (search?.trim()) qs.set('q', search.trim());
  if (expiringOnly) qs.set('expiring', 'true');
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  const res = await apiFetch(`/api/chat/conversations?${qs.toString()}`);
  return parseJsonResponse<{
    items: ChatConversationListItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(res);
}

async function fetchMemberConversation(): Promise<ChatConversationListItem> {
  const res = await apiFetch('/api/chat/conversations/mine');
  const data = await parseJsonResponse<ChatConversationListItem>(res);
  if (data == null || !Number.isFinite(Number(data.id))) {
    throw new Error('Conversación inválida');
  }
  return data;
}

async function fetchMessages(
  conversationId: number
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages`);
  return parseJsonResponse<{ messages: ChatMessage[]; hasMore: boolean }>(res);
}

async function openConversationWithMember(memberId: number): Promise<ChatConversationListItem> {
  const res = await apiFetch(`/api/chat/conversations/with/${memberId}`, { method: 'POST' });
  return parseJsonResponse<ChatConversationListItem>(res);
}

export function useChatUnreadQuery(enabled = true) {
  const { isConnected } = useSocket();

  return useQuery({
    queryKey: chatUnreadKey,
    queryFn: fetchUnreadCount,
    enabled,
    refetchInterval: enabled ? chatPollInterval(isConnected) : false,
  });
}

export function useChatConversationsQuery(
  search?: string,
  expiringOnly?: boolean,
  enabled = true,
  page = 1,
  pageSize = 50
) {
  const { isConnected } = useSocket();

  return useQuery({
    queryKey: chatConversationsKey(search, expiringOnly, page, pageSize),
    queryFn: () => fetchConversations(search, expiringOnly, page, pageSize),
    enabled,
    refetchInterval: enabled ? chatPollInterval(isConnected) : false,
  });
}

export function useMemberChatQuery(enabled = true) {
  const { isConnected } = useSocket();

  return useQuery({
    queryKey: chatMineKey,
    queryFn: fetchMemberConversation,
    enabled,
    refetchInterval: enabled ? chatPollInterval(isConnected) : false,
  });
}

export function useChatMessagesQuery(conversationId: number | null, enabled = true) {
  const { isConnected } = useSocket();

  return useQuery({
    queryKey: chatMessagesKey(conversationId ?? 0),
    queryFn: () => fetchMessages(conversationId!),
    enabled: enabled && conversationId != null,
    refetchInterval: enabled && conversationId != null ? chatPollInterval(isConnected) : false,
  });
}

interface SendChatVariables {
  conversationId: number;
  body: string;
  /** When retrying a failed optimistic bubble, replace this temp id. */
  retryTempId?: number;
}

interface MessagesCache {
  messages: ChatMessage[];
  hasMore: boolean;
}

function patchMessagesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: number,
  updater: (messages: ChatMessage[]) => ChatMessage[]
) {
  queryClient.setQueryData<MessagesCache>(chatMessagesKey(conversationId), (old) => {
    const messages = updater(old?.messages ?? []);
    return { messages, hasMore: old?.hasMore ?? false };
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body }: SendChatVariables) => {
      const res = await apiFetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      return parseJsonResponse<ChatMessage>(res);
    },
    onMutate: async (variables) => {
      const { conversationId, body, retryTempId } = variables;
      await queryClient.cancelQueries({ queryKey: chatMessagesKey(conversationId) });
      const previous = queryClient.getQueryData<MessagesCache>(chatMessagesKey(conversationId));
      const tempId = retryTempId ?? -Date.now();
      const optimistic: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: null,
        sender_name: null,
        sender_role: null,
        body,
        kind: 'text',
        event_type: 'manual',
        metadata: {},
        read_at: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        is_mine: true,
        client_status: 'sending',
      };
      patchMessagesCache(queryClient, conversationId, (messages) => {
        const withoutRetry =
          retryTempId != null ? messages.filter((m) => m.id !== retryTempId) : messages;
        return [...withoutRetry, optimistic];
      });
      return { previous, tempId };
    },
    onError: (_err, variables, context) => {
      if (context?.tempId == null) return;
      patchMessagesCache(queryClient, variables.conversationId, (messages) =>
        messages.map((m) =>
          m.id === context.tempId ? { ...m, client_status: 'failed' as const } : m
        )
      );
    },
    onSuccess: (data, variables, context) => {
      patchMessagesCache(queryClient, variables.conversationId, (messages) => {
        const withoutTemp =
          context?.tempId != null ? messages.filter((m) => m.id !== context.tempId) : messages;
        if (withoutTemp.some((m) => m.id === data.id)) return withoutTemp;
        return [...withoutTemp, data];
      });
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
      const res = await apiFetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
      });
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
      const res = await apiFetch(
        `/api/chat/conversations/${conversationId}/messages/${messageId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        }
      );
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
      const res = await apiFetch(
        `/api/chat/conversations/${conversationId}/messages/${messageId}`,
        {
          method: 'DELETE',
        }
      );
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
