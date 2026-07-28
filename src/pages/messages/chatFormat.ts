import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { dateLocale } from '../../lib/dateLocale';
import type { ChatMessage } from '../../hooks/queries/useChatQuery';
import { isStaffRole } from '../../lib/roles';

export const RECEPTION_QUICK_REPLIES = [
  '¿En qué podemos ayudarte?',
  'Tu pago fue recibido. ¡Gracias!',
  'Recuerda renovar tu membresía para seguir entrenando.',
  'Pasa por el mostrador cuando puedas, te esperamos.',
] as const;

export const TRAINER_QUICK_REPLIES = [
  '¿Cómo te fue con la rutina?',
  'Avísame si tienes alguna molestia al entrenar.',
  'Tu nueva rutina ya está lista. ¡A entrenar!',
] as const;

export const ADMIN_QUICK_REPLIES = [
  'Hola, ¿en qué podemos ayudarte desde administración?',
  'Recibido. Te respondemos en breve.',
] as const;

export function quickRepliesForRole(role: string | undefined): readonly string[] {
  if (role === 'receptionist') return RECEPTION_QUICK_REPLIES;
  if (role === 'trainer') return TRAINER_QUICK_REPLIES;
  if (role === 'admin') return ADMIN_QUICK_REPLIES;
  return [];
}

export function formatMessageTime(iso: string): string {
  try {
    return format(new Date(iso), 'HH:mm', { locale: dateLocale });
  } catch {
    return iso;
  }
}

export function formatMessageDay(iso: string): string {
  try {
    const d = new Date(iso);
    if (isToday(d)) return 'Hoy';
    if (isYesterday(d)) return 'Ayer';
    return format(d, 'd MMM', { locale: dateLocale });
  } catch {
    return iso;
  }
}

export function formatListTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isToday(d)) return format(d, 'HH:mm', { locale: dateLocale });
    if (isYesterday(d)) return 'Ayer';
    if (isThisYear(d)) return format(d, 'd MMM', { locale: dateLocale });
    return format(d, 'dd/MM/yy', { locale: dateLocale });
  } catch {
    return '';
  }
}

export function getMessageAttachment(
  message: ChatMessage
): { url: string; mime: string; name: string } | null {
  const raw = message.metadata?.attachment;
  if (!raw || typeof raw !== 'object') return null;
  const att = raw as { url?: unknown; mime?: unknown; name?: unknown };
  if (typeof att.url !== 'string' || !att.url) return null;
  return {
    url: att.url,
    mime: typeof att.mime === 'string' ? att.mime : 'image/*',
    name: typeof att.name === 'string' ? att.name : 'Imagen',
  };
}

export function resolveChatAttachmentSrc(url: string, conversationId: number): string {
  if (url.startsWith('blob:') || url.startsWith('/api/') || url.startsWith('http')) return url;
  if (url.startsWith('sbmedia:chat:')) {
    const rest = url.slice('sbmedia:chat:'.length);
    const slash = rest.indexOf('/');
    if (slash > 0) {
      const filename = rest.slice(slash + 1);
      return `/api/chat/conversations/${conversationId}/attachments/${encodeURIComponent(filename)}`;
    }
  }
  return url;
}

export function sameCalendarDay(a: string, b: string): boolean {
  try {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  } catch {
    return false;
  }
}

export function systemMessageAction(
  message: ChatMessage,
  viewerRole: string | undefined
): { label: string; to: string } | null {
  const paymentId =
    typeof message.metadata?.payment_id === 'number'
      ? message.metadata.payment_id
      : typeof message.metadata?.payment_id === 'string'
        ? Number(message.metadata.payment_id)
        : null;
  const staff = viewerRole != null && isStaffRole(viewerRole);

  switch (message.event_type) {
    case 'expiring_soon':
    case 'expired':
      return viewerRole === 'member'
        ? { label: 'Ir a pagos', to: '/payments' }
        : { label: 'Ver pagos', to: '/payments' };
    case 'payment_approved':
    case 'payment_rejected':
      return { label: 'Ver pagos', to: '/payments' };
    case 'payment_reported':
      if (staff) {
        const qs =
          paymentId != null && Number.isFinite(paymentId)
            ? `?status=pending&paymentId=${paymentId}`
            : '?status=pending';
        return { label: 'Revisar pago', to: `/payments${qs}` };
      }
      return { label: 'Ver pagos', to: '/payments' };
    case 'routine_assigned':
      return viewerRole === 'member' ? { label: 'Ver rutinas', to: '/routines' } : null;
    default:
      return null;
  }
}

export function resolveBubbleSide(
  message: ChatMessage,
  viewerRole: string | undefined
): 'start' | 'end' | 'center' {
  if (message.kind === 'system') return 'center';

  const viewerIsStaff = viewerRole != null && isStaffRole(viewerRole);
  const senderIsStaff = message.sender_role != null && isStaffRole(message.sender_role);

  if (viewerIsStaff) {
    return senderIsStaff ? 'end' : 'start';
  }

  if (viewerRole === 'member') {
    return message.is_mine ? 'end' : 'start';
  }

  return message.is_mine ? 'end' : 'start';
}

export function canManageOwnMessage(
  message: ChatMessage,
  userId: number | undefined,
  viewerRole: string | undefined
): boolean {
  if (message.client_status) return false;
  if (!userId || message.kind !== 'text' || message.event_type !== 'manual') {
    return false;
  }
  const isSender = message.sender_id != null && Number(message.sender_id) === Number(userId);
  if (!isSender && !message.is_mine) return false;
  return resolveBubbleSide(message, viewerRole) === 'end';
}
