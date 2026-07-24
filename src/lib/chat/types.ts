export type ChatMessageKind = 'text' | 'system';

export type ChatStaffChannel = 'admin' | 'receptionist' | 'trainer';

export const CHAT_STAFF_CHANNELS: ChatStaffChannel[] = ['admin', 'receptionist', 'trainer'];

export const CHAT_CHANNEL_LABELS: Record<ChatStaffChannel, string> = {
  admin: 'Administración',
  receptionist: 'Recepción',
  trainer: 'Entrenador',
};

export type ChatEventType =
  | 'manual'
  | 'expiring_soon'
  | 'expired'
  | 'payment_reported'
  | 'payment_approved'
  | 'payment_rejected'
  | 'routine_assigned';

export type ChatSystemAlertType = Exclude<ChatEventType, 'manual'>;

export function isChatStaffChannel(value: string): value is ChatStaffChannel {
  return CHAT_STAFF_CHANNELS.includes(value as ChatStaffChannel);
}

/** Maps automated events to the operational channel. `payment_reported` stays out of chat. */
export function channelForSystemEvent(eventType: ChatSystemAlertType): ChatStaffChannel | null {
  switch (eventType) {
    case 'payment_approved':
    case 'payment_rejected':
    case 'expiring_soon':
    case 'expired':
      return 'receptionist';
    case 'routine_assigned':
      return 'trainer';
    case 'payment_reported':
      return null;
    default:
      return 'receptionist';
  }
}

export interface ChatConversationRow {
  id: number;
  member_id: number;
  channel: ChatStaffChannel;
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
  channel: ChatStaffChannel;
  channel_label: string;
  member_name: string;
  member_cedula: string;
  member_avatar: string | null;
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
