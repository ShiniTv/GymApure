export type ChatMessageKind = 'text' | 'system';

export type ChatEventType =
  | 'manual'
  | 'expiring_soon'
  | 'expired'
  | 'payment_reported'
  | 'payment_approved'
  | 'payment_rejected'
  | 'routine_assigned';

export type ChatSystemAlertType = Exclude<ChatEventType, 'manual'>;

export interface ChatConversationRow {
  id: number;
  member_id: number;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  body: string;
  kind: ChatMessageKind;
  event_type: ChatEventType;
  metadata: Record<string, unknown>;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface ChatConversationListItem {
  id: number;
  member_id: number;
  member_name: string;
  member_cedula: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_kind: ChatMessageKind | null;
  unread_count: number;
  days_remaining: number | null;
  membership_name: string | null;
}

export interface ChatMessageDto {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_role: string | null;
  body: string;
  kind: ChatMessageKind;
  event_type: ChatEventType;
  metadata: Record<string, unknown>;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
  is_mine: boolean;
}
