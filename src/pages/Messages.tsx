import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { dateLocale } from '../lib/dateLocale';
import { useAuth } from '../context/AuthContext';
import {
  useChatConversationsQuery,
  useChatMessagesQuery,
  useDeleteChatMessage,
  useEditChatMessage,
  useMarkChatRead,
  useMemberChatQuery,
  useOpenChatWithMember,
  useOpenMemberChannel,
  useSendChatMessage,
  type ChatConversationListItem,
  type ChatMessage,
  type ChatStaffChannel,
} from '../hooks/queries/useChatQuery';
import { CHAT_CHANNEL_LABELS, isChatStaffChannel } from '../lib/chat/types';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { getExpiryBadgeInfo } from '../lib/expiryUtils';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FilterChips,
  Modal,
  PageHeader,
  PaginationBar,
  SearchInput,
  Spinner,
  BackToDashboardLink,
  ListRowSkeleton,
  ChatBubbleSkeleton,
  Skeleton,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { fieldClassName } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../lib/api';
import { useToastOptional } from '../context/ToastContext';
import { isStaffRole } from '../lib/roles';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import {
  Check,
  CheckCheck,
  CreditCard,
  Dumbbell,
  ImagePlus,
  MessageSquare,
  Pencil,
  RotateCcw,
  Search,
  Send,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useChatTyping } from '../hooks/useChatTyping';

interface MemberChatOption {
  id: number;
  full_name: string;
  cedula: string | null;
}

const RECEPTION_QUICK_REPLIES = [
  '¿En qué podemos ayudarte?',
  'Tu pago fue recibido. ¡Gracias!',
  'Recuerda renovar tu membresía para seguir entrenando.',
  'Pasa por el mostrador cuando puedas, te esperamos.',
] as const;

const TRAINER_QUICK_REPLIES = [
  '¿Cómo te fue con la rutina?',
  'Avísame si tienes alguna molestia al entrenar.',
  'Tu nueva rutina ya está lista. ¡A entrenar!',
] as const;

const ADMIN_QUICK_REPLIES = [
  'Hola, ¿en qué podemos ayudarte desde administración?',
  'Recibido. Te respondemos en breve.',
] as const;

function quickRepliesForRole(role: string | undefined): readonly string[] {
  if (role === 'receptionist') return RECEPTION_QUICK_REPLIES;
  if (role === 'trainer') return TRAINER_QUICK_REPLIES;
  if (role === 'admin') return ADMIN_QUICK_REPLIES;
  return [];
}

function formatMessageTime(iso: string): string {
  try {
    return format(new Date(iso), 'HH:mm', { locale: dateLocale });
  } catch {
    return iso;
  }
}

function formatMessageDay(iso: string): string {
  try {
    const d = new Date(iso);
    if (isToday(d)) return 'Hoy';
    if (isYesterday(d)) return 'Ayer';
    return format(d, 'd MMM', { locale: dateLocale });
  } catch {
    return iso;
  }
}

function formatListTime(iso: string): string {
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

function getMessageAttachment(
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

function resolveChatAttachmentSrc(url: string, conversationId: number): string {
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

function sameCalendarDay(a: string, b: string): boolean {
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

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="my-2.5 flex items-center gap-2.5 px-1" role="separator">
      <div className="h-px flex-1 bg-zinc-200/70 dark:bg-zinc-800/80" />
      <span className="shrink-0 text-[10px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
        {formatMessageDay(iso)}
      </span>
      <div className="h-px flex-1 bg-zinc-200/70 dark:bg-zinc-800/80" />
    </div>
  );
}

function systemMessageAction(
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

function resolveBubbleSide(
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

function canManageOwnMessage(
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

const ChatBubble = memo(function ChatBubble({
  message,
  conversationId,
}: {
  message: ChatMessage;
  conversationId: number;
}) {
  const { user } = useAuth();
  const toast = useToastOptional();
  const editMessage = useEditChatMessage();
  const deleteMessage = useDeleteChatMessage();
  const sendMessage = useSendChatMessage();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const side = resolveBubbleSide(message, user?.role);
  const isOutgoing = side === 'end';
  const isSystem = side === 'center';
  const manageable = canManageOwnMessage(message, user?.id, user?.role);
  const systemAction = isSystem ? systemMessageAction(message, user?.role) : null;
  const attachment = getMessageAttachment(message);
  const attachmentSrc = attachment
    ? resolveChatAttachmentSrc(attachment.url, conversationId)
    : null;
  const showCaption = message.body.trim().length > 0 && message.body.trim() !== 'Imagen';
  const trimmedDraft = draft.trim();
  const canSave =
    trimmedDraft.length > 0 && trimmedDraft !== message.body.trim() && !editMessage.isPending;
  const previewBody =
    message.body.length > 120 ? `${message.body.slice(0, 120).trim()}…` : message.body;

  useEffect(() => {
    if (!isEditing) setDraft(message.body);
  }, [message.body, isEditing]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    },
    []
  );

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLongPressStart = () => {
    if (!manageable || isEditing) return;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setIsEditing(true);
    }, 500);
  };

  const cancelEdit = () => {
    setDraft(message.body);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!canSave) return;
    try {
      await editMessage.mutateAsync({
        conversationId,
        messageId: message.id,
        body: trimmedDraft,
      });
      setIsEditing(false);
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo guardar el mensaje'));
    }
  };

  const confirmDelete = async () => {
    if (deleteMessage.isPending) return;
    try {
      await deleteMessage.mutateAsync({
        conversationId,
        messageId: message.id,
      });
      setShowDeleteConfirm(false);
      toast?.success('Mensaje eliminado');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo eliminar el mensaje'));
    }
  };

  if (isSystem) {
    return (
      <div className="my-2 flex w-full justify-center px-2">
        <div className="max-w-[20rem] text-center sm:max-w-sm">
          <p className="rounded-2xl bg-zinc-100/90 px-3 py-1.5 text-[11px] leading-snug text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
            {message.body}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
            <p className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
              {formatMessageTime(message.created_at)}
            </p>
            {systemAction ? (
              <Link
                to={systemAction.to}
                className="text-brand text-[10px] font-semibold hover:underline"
              >
                {systemAction.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group mb-1.5 flex w-full px-0.5',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      {isEditing ? (
        <div
          className={clsx(
            'w-full rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900',
            isOutgoing
              ? 'border-brand/20 dark:border-brand/40 max-w-md'
              : 'max-w-md border-zinc-200 dark:border-zinc-700'
          )}
        >
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            rows={3}
            className={cn(
              fieldClassName,
              'min-h-[88px] w-full resize-none text-sm text-zinc-900 dark:text-zinc-100'
            )}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void saveEdit();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Cancelar edición"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void saveEdit()}
              className="brand-solid brand-solid-hover inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Guardar cambios"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={clsx(
            'flex max-w-[88%] flex-col gap-1 sm:max-w-[72%]',
            isOutgoing ? 'items-end' : 'items-start'
          )}
        >
          {!isOutgoing && message.sender_name ? (
            <p className="px-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              {message.sender_name}
            </p>
          ) : null}
          <button
            type="button"
            className={clsx(
              'w-fit max-w-full rounded-2xl px-3 py-2 text-left transition-opacity',
              isOutgoing
                ? 'brand-solid rounded-br-md text-white'
                : 'rounded-bl-md border border-zinc-200/50 bg-white text-zinc-800 shadow-sm shadow-zinc-900/5 dark:border-zinc-700/60 dark:bg-zinc-800/70 dark:text-zinc-100 dark:shadow-none',
              manageable && 'cursor-pointer',
              message.client_status === 'sending' && 'opacity-80',
              message.client_status === 'failed' && 'opacity-90 ring-1 ring-red-400/40'
            )}
            onClick={() => {
              if (!manageable || isEditing) return;
              setActionsOpen((open) => !open);
            }}
            onTouchStart={handleLongPressStart}
            onTouchEnd={clearLongPress}
            onTouchCancel={clearLongPress}
            onTouchMove={clearLongPress}
            aria-expanded={manageable ? actionsOpen : undefined}
            aria-label={manageable ? 'Mensaje, opciones disponibles' : undefined}
          >
            {attachmentSrc ? (
              <a
                href={attachmentSrc}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mb-1.5 block overflow-hidden rounded-xl"
              >
                <img
                  src={attachmentSrc}
                  alt={attachment?.name || 'Imagen adjunta'}
                  className="max-h-56 max-w-full object-cover"
                  loading="lazy"
                />
              </a>
            ) : null}
            {showCaption || !attachmentSrc ? (
              <p className="text-[13px] leading-snug break-words whitespace-pre-wrap text-inherit sm:text-sm">
                {message.body}
              </p>
            ) : null}
            <p
              className={clsx(
                'mt-0.5 flex items-center justify-end gap-1 text-[10px] tabular-nums',
                isOutgoing ? 'text-white/70' : 'text-zinc-400 dark:text-zinc-500'
              )}
            >
              {message.client_status === 'sending' ? (
                <span>Enviando…</span>
              ) : message.client_status === 'failed' ? (
                <span className="text-red-200">No enviado</span>
              ) : (
                <>
                  <span>
                    {formatMessageTime(message.created_at)}
                    {message.edited_at ? ' · editado' : ''}
                  </span>
                  {isOutgoing ? (
                    message.read_at ? (
                      <CheckCheck className="h-3.5 w-3.5 opacity-95" aria-label="Leído" />
                    ) : (
                      <Check className="h-3 w-3 opacity-80" aria-label="Enviado" />
                    )
                  ) : null}
                </>
              )}
            </p>
          </button>
          {message.client_status === 'failed' && (
            <button
              type="button"
              onClick={() => {
                void sendMessage.mutateAsync({
                  conversationId,
                  body: message.body,
                  retryTempId: message.id,
                });
              }}
              disabled={sendMessage.isPending}
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold text-red-500 hover:bg-red-500/10"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reintentar
            </button>
          )}
          {manageable && (
            <div
              className={clsx(
                'flex items-center gap-0.5 transition-opacity',
                actionsOpen
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:focus-within:pointer-events-auto sm:focus-within:opacity-100'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setActionsOpen(false);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Editar mensaje"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setActionsOpen(false);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                aria-label="Eliminar mensaje"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={showDeleteConfirm}
        onClose={() => !deleteMessage.isPending && setShowDeleteConfirm(false)}
        title="Eliminar mensaje"
        maxWidth="sm"
      >
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">¿Eliminar este mensaje?</p>
        <p className="mb-2 line-clamp-3 text-xs text-zinc-500 dark:text-zinc-400">
          «{previewBody}»
        </p>
        <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-400">
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setShowDeleteConfirm(false);
            }}
            disabled={deleteMessage.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => void confirmDelete()}
            disabled={deleteMessage.isPending}
          >
            {deleteMessage.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
});

function ChatComposer({
  conversationId,
  disabled,
  placeholder = 'Escribe un mensaje…',
  quickReplies = [],
}: {
  conversationId: number;
  disabled?: boolean;
  placeholder?: string;
  quickReplies?: readonly string[];
}) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendChatMessage();
  const toast = useToastOptional();
  const { typingLabel, emitTyping } = useChatTyping(conversationId);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    const trimmed = body.trim();
    if ((!trimmed && !file) || disabled) return;
    const outgoingFile = file;
    setBody('');
    clearFile();
    emitTyping(false);
    void sendMessage
      .mutateAsync({ conversationId, body: trimmed, file: outgoingFile })
      .catch((err) => {
        toast?.error(toDisplayErrorMessage(err, 'No se pudo enviar el mensaje'));
      });
  };

  return (
    <div className="shrink-0 border-t border-zinc-100/80 bg-transparent px-2 py-2 sm:bg-white sm:px-3 dark:border-zinc-800/80 dark:sm:bg-zinc-900">
      {typingLabel ? (
        <p className="mb-1.5 px-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {typingLabel}
        </p>
      ) : null}
      {quickReplies.length > 0 ? (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={disabled}
              onClick={() => setBody(reply)}
              className="hover:border-brand/30 hover:bg-brand/5 shrink-0 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:text-white"
            >
              {reply.length > 42 ? `${reply.slice(0, 40)}…` : reply}
            </button>
          ))}
        </div>
      ) : null}
      {previewUrl ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950/40">
          <img src={previewUrl} alt="Vista previa" className="h-14 w-14 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
              {file?.name}
            </p>
            <p className="text-[10px] text-zinc-500">Se enviará con el mensaje</p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            if (!next) return;
            if (next.size > 5 * 1024 * 1024) {
              toast?.error('La imagen no puede superar 5 MB');
              return;
            }
            setFile(next);
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Adjuntar imagen"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            emitTyping(e.target.value.trim().length > 0);
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          onBlur={() => emitTyping(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className={cn(
            fieldClassName,
            'max-h-24 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-full border-zinc-200/80 px-3.5 py-2 text-sm leading-5',
            'bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-white',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'caret-[var(--color-brand)]'
          )}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || (!body.trim() && !file)}
          onClick={handleSend}
          className="h-10 w-10 shrink-0 rounded-full p-0"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const ConversationListItem = memo(function ConversationListItem({
  item,
  selected,
  alertDays,
  onSelect,
}: {
  item: ChatConversationListItem;
  selected: boolean;
  alertDays: number;
  onSelect: () => void;
}) {
  const expiryBadge = getExpiryBadgeInfo(item.days_remaining, alertDays);
  const listTime = item.last_message_at ? formatListTime(item.last_message_at) : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-xl border px-2.5 py-2.5 text-left transition-colors sm:rounded-lg sm:py-2',
        selected
          ? 'border-brand/40 bg-brand/5'
          : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar
          src={item.member_avatar}
          name={item.member_name}
          size="sm"
          className="mt-0.5 !h-9 !w-9 shrink-0 !text-[10px] !ring-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {item.member_name}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {listTime ? (
                <span className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                  {listTime}
                </span>
              ) : null}
              {item.unread_count > 0 ? (
                <span className="nav-badge brand-solid">
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </span>
              ) : null}
            </div>
          </div>
          {item.member_cedula ? (
            <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-500">
              {item.member_cedula}
              {item.membership_name ? ` · ${item.membership_name}` : ''}
            </p>
          ) : item.membership_name ? (
            <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-500">
              {item.membership_name}
            </p>
          ) : null}
          {item.last_message_preview ? (
            <p
              className={clsx(
                'mt-1 truncate text-xs',
                item.unread_count > 0
                  ? 'font-medium text-zinc-700 dark:text-zinc-200'
                  : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {item.last_message_preview}
            </p>
          ) : null}
          {expiryBadge ? (
            <Badge className={clsx('mt-1.5', expiryBadge.className)}>{expiryBadge.label}</Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
});

function StaffChatView() {
  usePageTitle('Mensajes');
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const isTrainer = user?.role === 'trainer';
  const isReception = user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';
  const staffChannelLabel =
    user?.role && isChatStaffChannel(user.role) ? CHAT_CHANNEL_LABELS[user.role] : 'Staff';
  const staffSubtitle = isTrainer
    ? 'Canal entrenador: solo tus clientes asignados'
    : `Canal ${staffChannelLabel.toLowerCase()}: solo este rol ve estos chats`;
  const [searchParams, setSearchParams] = useSearchParams();
  const adminStats = useAdminStatsOptional();
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'expiring'>('all');
  const expiringOnly = listFilter === 'expiring';
  const unreadOnly = listFilter === 'unread';
  const [listPage, setListPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ChatConversationListItem | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [memberHits, setMemberHits] = useState<MemberChatOption[]>([]);
  const [memberHitsLoading, setMemberHitsLoading] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const openWithMember = useOpenChatWithMember();
  const markRead = useMarkChatRead();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const quickReplies = quickRepliesForRole(user?.role);

  const memberParam = searchParams.get('member');
  const { data: conversationsPage, isPending: loadingList } = useChatConversationsQuery(
    search,
    expiringOnly,
    unreadOnly,
    true,
    listPage,
    50
  );
  const conversations = conversationsPage?.items ?? [];
  const conversationsTotal = conversationsPage?.total ?? 0;
  const conversationsPageSize = conversationsPage?.pageSize ?? 50;
  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(
    selectedId,
    selectedId != null
  );

  const conversationMemberIds = useMemo(
    () => new Set(conversations.map((c) => c.member_id)),
    [conversations]
  );

  const startableMembers = useMemo(
    () => memberHits.filter((m) => !conversationMemberIds.has(m.id)).slice(0, 8),
    [memberHits, conversationMemberIds]
  );

  useEffect(() => {
    setListPage(1);
  }, [search, listFilter]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 2 || listFilter !== 'all') {
      setMemberHits([]);
      setMemberHitsLoading(false);
      return;
    }

    let cancelled = false;
    setMemberHitsLoading(true);
    void apiFetch(`/api/users/options?role=member&q=${encodeURIComponent(q)}`)
      .then((res) => parseJsonResponse<MemberChatOption[]>(res))
      .then((data) => {
        if (!cancelled) setMemberHits(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMemberHits([]);
      })
      .finally(() => {
        if (!cancelled) setMemberHitsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, listFilter]);

  const startChatWithMember = useCallback(
    (memberId: number) => {
      void openWithMember
        .mutateAsync(memberId)
        .then((conversation) => {
          setSelectedId(conversation.id);
          setSelectedSnapshot(conversation);
          setShowChatOnMobile(true);
          setSearch('');
          toast?.success('Chat abierto');
        })
        .catch((err) => {
          toast?.error(toDisplayErrorMessage(err, 'No puedes abrir este chat'));
        });
    },
    [openWithMember, toast]
  );
  useEffect(() => {
    if (!memberParam || openWithMember.isPending) return;
    const memberId = parseInt(memberParam, 10);
    if (!Number.isFinite(memberId)) return;

    void openWithMember
      .mutateAsync(memberId)
      .then((conversation) => {
        setSelectedId(conversation.id);
        setSelectedSnapshot(conversation);
        setShowChatOnMobile(true);
        setSearchParams({}, { replace: true });
      })
      .catch((err) => {
        toast?.error(toDisplayErrorMessage(err, 'No puedes abrir este chat'));
        setSearchParams({}, { replace: true });
      });
  }, [memberParam, openWithMember, setSearchParams, toast]);

  useEffect(() => {
    if (selectedId == null && conversations.length > 0 && !memberParam) {
      setSelectedId(conversations[0].id);
      setSelectedSnapshot(conversations[0]);
    }
  }, [conversations, selectedId, memberParam]);

  useEffect(() => {
    if (selectedId == null) return;
    const fromList = conversations.find((c) => c.id === selectedId);
    if (fromList) setSelectedSnapshot(fromList);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (selectedId != null) {
      markRead.mutate(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    setThreadSearch('');
    setThreadSearchOpen(false);
  }, [selectedId]);

  const selected =
    conversations.find((c) => c.id === selectedId) ??
    (selectedSnapshot?.id === selectedId ? selectedSnapshot : null);

  const staffMessages = messagesData?.messages ?? [];
  const threadQuery = threadSearch.trim().toLowerCase();
  const visibleStaffMessages = useMemo(() => {
    if (!threadQuery) return staffMessages;
    return staffMessages.filter((m) => m.body.toLowerCase().includes(threadQuery));
  }, [staffMessages, threadQuery]);

  const selectedExpiry = selected ? getExpiryBadgeInfo(selected.days_remaining, alertDays) : null;

  const handleSelectConversation = (id: number) => {
    const item = conversations.find((c) => c.id === id) ?? null;
    setSelectedId(id);
    if (item) setSelectedSnapshot(item);
    setShowChatOnMobile(true);
  };

  const handleBackToList = () => {
    setShowChatOnMobile(false);
  };

  const renderConversationListBody = () => {
    if (loadingList) {
      return <ListRowSkeleton rows={6} />;
    }
    if (conversations.length === 0 && startableMembers.length === 0 && !memberHitsLoading) {
      return (
        <EmptyState
          compact
          icon={MessageSquare}
          title={search.trim() || listFilter !== 'all' ? 'Sin resultados' : 'Sin conversaciones'}
          description={
            search.trim()
              ? 'No hay chats ni miembros que coincidan. Prueba otro nombre o cédula.'
              : listFilter === 'unread'
                ? 'No hay mensajes sin leer en este canal.'
                : listFilter === 'expiring'
                  ? `Nadie por vencer en los próximos ${alertDays} días.`
                  : isTrainer
                    ? 'Aparecen cuando un cliente tuyo escribe o cuando abres el chat desde aquí buscando su nombre.'
                    : 'Busca un miembro arriba para iniciar un chat, o espera avisos automáticos.'
          }
          action={
            isTrainer && !search.trim() && listFilter === 'all' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/routines?view=calendar&assign=1')}
              >
                Asignar rutina
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <>
        {startableMembers.length > 0 && (
          <div className="mb-2 space-y-1 border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <p className="px-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
              Iniciar chat
            </p>
            {startableMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                disabled={openWithMember.isPending}
                onClick={() => startChatWithMember(member.id)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <UserPlus className="text-brand h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {member.full_name}
                  </p>
                  {member.cedula ? (
                    <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                      {member.cedula}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
        {memberHitsLoading && conversations.length === 0 ? (
          <div className="flex justify-center py-4">
            <Spinner size="xs" />
          </div>
        ) : null}
        {conversations.map((item) => (
          <div key={item.id} className="pb-1">
            <ConversationListItem
              item={item}
              selected={item.id === selectedId}
              alertDays={alertDays}
              onSelect={() => {
                handleSelectConversation(item.id);
              }}
            />
          </div>
        ))}
        {conversationsTotal > conversationsPageSize ? (
          <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <PaginationBar
              page={listPage}
              pageSize={conversationsPageSize}
              total={conversationsTotal}
              onPageChange={setListPage}
            />
          </div>
        ) : null}
      </>
    );
  };

  const listToolbar = (
    <div className="space-y-2">
      {isTrainer ? (
        <p className="rounded-lg bg-zinc-100/80 px-2.5 py-1.5 text-[11px] leading-snug font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
          <span className="sm:hidden">Solo tus clientes con rutina</span>
          <span className="hidden sm:inline">Solo clientes con rutina asignada por ti</span>
        </p>
      ) : null}
      <SearchInput
        containerClassName="min-w-0 w-full"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder={isTrainer ? 'Buscar cliente…' : 'Buscar miembro…'}
      />
      <FilterChips
        className="w-fit max-w-full"
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'unread', label: 'No leídos' },
          { value: 'expiring', label: `Por vencer (${alertDays}d)` },
        ]}
        value={listFilter}
        onChange={(v) => setListFilter((v as 'all' | 'unread' | 'expiring') || 'all')}
      />
    </div>
  );

  const contextRail =
    selected && selected.member_id > 0 ? (
      <div className="hidden min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200/70 bg-white/80 xl:flex dark:border-zinc-800/80 dark:bg-zinc-900/50">
        <div className="shrink-0 border-b border-zinc-100/80 px-3 py-3 dark:border-zinc-800/80">
          <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
            Contexto
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar src={selected.member_avatar} name={selected.member_name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {selected.member_name}
              </p>
              {selected.member_cedula ? (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selected.member_cedula}
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2 rounded-xl bg-zinc-50/80 p-3 dark:bg-zinc-950/40">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
              Membresía
            </p>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {selected.membership_name ?? 'Sin plan activo'}
            </p>
            {selectedExpiry ? (
              <Badge className={selectedExpiry.className}>{selectedExpiry.label}</Badge>
            ) : selected.days_remaining != null ? (
              <p className="text-xs text-zinc-500">{selected.days_remaining} días restantes</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <p className="px-0.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
              Atajos
            </p>
            {(isAdmin || isReception) && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() =>
                  navigate(
                    `/members?q=${encodeURIComponent(selected.member_cedula || selected.member_name)}`
                  )
                }
              >
                <User className="h-3.5 w-3.5" />
                Ver en miembros
              </Button>
            )}
            {(isAdmin || isReception) && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/payments?status=pending')}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Ir a pagos
              </Button>
            )}
            {isTrainer && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/members/${selected.member_id}/routines`)}
              >
                <Dumbbell className="h-3.5 w-3.5" />
                Ver rutinas
              </Button>
            )}
            {isTrainer && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() =>
                  navigate(`/routines?view=calendar&assign=1&member=${selected.member_id}`)
                }
              >
                <Dumbbell className="h-3.5 w-3.5" />
                Asignar rutina
              </Button>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/members/${selected.member_id}/history`)}
              >
                <User className="h-3.5 w-3.5" />
                Historial
              </Button>
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="hidden min-h-0 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200/80 p-4 xl:flex dark:border-zinc-800">
        <EmptyState
          compact
          icon={User}
          title="Sin contexto"
          description="Selecciona un chat para ver membresía y atajos."
          className="border-0 bg-transparent p-0 shadow-none"
        />
      </div>
    );

  const chatThread = selected ? (
    <>
      <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-100/80 px-2 py-2 sm:px-3 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Volver a conversaciones"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar
            src={selected.member_avatar}
            name={selected.member_name}
            size="sm"
            className="!h-8 !w-8 shrink-0 !text-[10px] !ring-1"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {selected.member_name}
            </p>
            <p className="hidden truncate text-[10px] text-zinc-500 sm:block dark:text-zinc-400">
              {[selected.member_cedula, selected.membership_name].filter(Boolean).join(' · ') ||
                'Miembro'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setThreadSearchOpen((open) => !open)}
            className={clsx(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
              threadSearchOpen
                ? 'bg-brand/10 text-brand'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            )}
            aria-label="Buscar en la conversación"
            aria-pressed={threadSearchOpen}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {threadSearchOpen ? (
          <SearchInput
            containerClassName="w-full"
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
            placeholder="Buscar en este chat…"
            autoFocus
          />
        ) : null}
        {threadQuery && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {visibleStaffMessages.length === 0
              ? 'Sin coincidencias'
              : `${visibleStaffMessages.length} mensaje${visibleStaffMessages.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {loadingMessages && !messagesData ? (
          <ChatBubbleSkeleton />
        ) : staffMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              compact
              variant="motivational"
              icon={MessageSquare}
              title={`Escribe a ${selected.member_name.split(' ')[0] || 'este miembro'}`}
              description="Aún no hay mensajes en este chat. Envía el primero o usa una respuesta rápida."
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
        ) : visibleStaffMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              compact
              icon={Search}
              title="Sin coincidencias"
              description="Prueba otra palabra o limpia la búsqueda."
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%', width: '100%' }}
            className="absolute inset-0"
            data={visibleStaffMessages}
            itemContent={(index, message) => {
              const prev = visibleStaffMessages[index - 1];
              const showDay = !prev || !sameCalendarDay(prev.created_at, message.created_at);
              return (
                <div className="px-2.5 pt-1 sm:px-3">
                  {showDay ? <DaySeparator iso={message.created_at} /> : null}
                  <ChatBubble message={message} conversationId={selected.id} />
                </div>
              );
            }}
            followOutput={threadQuery ? false : 'smooth'}
          />
        )}
      </div>
      <ChatComposer conversationId={selected.id} quickReplies={quickReplies} />
    </>
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <EmptyState
        compact
        icon={MessageSquare}
        title="Selecciona una conversación"
        description="Elige un miembro de la lista para chatear."
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );

  const threadOpenOnMobile = showChatOnMobile && selected != null;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-[90rem]">
      <div className={clsx('space-y-3 md:hidden', threadOpenOnMobile && 'hidden')}>
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">del gym</span>
            </>
          }
          subtitle={staffSubtitle}
          action={<BackToDashboardLink />}
        />
        {listToolbar}
        <div className="space-y-0.5 pb-2">{renderConversationListBody()}</div>
      </div>

      {threadOpenOnMobile ? (
        <div className="staff-chat-mobile-thread flex flex-col overflow-hidden md:hidden">
          {chatThread}
        </div>
      ) : null}

      <div className="hidden md:block">
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">del gym</span>
            </>
          }
          subtitle={staffSubtitle}
          action={<BackToDashboardLink />}
        />
        <div className="staff-chat-shell mt-0 grid min-h-0 grid-cols-[minmax(240px,300px)_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(220px,260px)]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            <div className="shrink-0 space-y-2 border-b border-zinc-100/80 p-3 dark:border-zinc-800/80">
              {listToolbar}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {renderConversationListBody()}
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200/70 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/50">
            {chatThread}
          </div>
          {contextRail}
        </div>
      </div>
    </div>
  );
}

const MEMBER_CHANNEL_ORDER: ChatStaffChannel[] = ['receptionist', 'admin', 'trainer'];

const MEMBER_CHANNEL_META: Record<
  ChatStaffChannel,
  { description: string; composer: string; emptyTitle: string; emptyDescription: string }
> = {
  receptionist: {
    description: 'Pagos, membresía y mostrador',
    composer: 'Escribe a recepción…',
    emptyTitle: 'Chat con recepción',
    emptyDescription: 'Avisos de pagos y membresía. Escribe aquí para el mostrador.',
  },
  admin: {
    description: 'Consultas con administración',
    composer: 'Escribe a administración…',
    emptyTitle: 'Chat con administración',
    emptyDescription: 'Mensajes directos con el equipo administrativo del gym.',
  },
  trainer: {
    description: 'Rutinas y coaching',
    composer: 'Escribe a tu entrenador…',
    emptyTitle: 'Chat con tu entrenador',
    emptyDescription: 'Aquí verás avisos de rutinas y podrás escribirle a tu entrenador.',
  },
};

function MemberChannelButton({
  channel,
  item,
  selected,
  onSelect,
}: {
  channel: ChatStaffChannel;
  item: ChatConversationListItem | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = MEMBER_CHANNEL_META[channel];
  const unread = item?.unread_count ?? 0;
  const listTime = item?.last_message_at ? formatListTime(item.last_message_at) : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
        selected
          ? 'border-brand/40 bg-brand/5'
          : 'hover:border-brand/30 hover:bg-brand/5 dark:hover:border-brand/40 border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/60'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {CHAT_CHANNEL_LABELS[channel]}
          </p>
          {listTime ? (
            <span className="shrink-0 text-[10px] text-zinc-400 tabular-nums">{listTime}</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {item?.last_message_preview?.trim() || meta.description}
        </p>
      </div>
      {unread > 0 ? (
        <span className="nav-badge brand-solid shrink-0">{unread > 99 ? '99+' : unread}</span>
      ) : null}
    </button>
  );
}

function MemberChatView() {
  usePageTitle('Mensajes');
  const toast = useToastOptional();
  const [searchParams, setSearchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');
  const selectedChannel = channelParam && isChatStaffChannel(channelParam) ? channelParam : null;

  const {
    data: conversations = [],
    isPending,
    isError,
    isFetching,
    error,
    refetch,
  } = useMemberChatQuery(true);
  const openChannel = useOpenMemberChannel();
  const markRead = useMarkChatRead();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [activeConversation, setActiveConversation] = useState<ChatConversationListItem | null>(
    null
  );
  const [openingChannel, setOpeningChannel] = useState(false);
  const openingForRef = useRef<ChatStaffChannel | null>(null);

  const conversationByChannel = useMemo(() => {
    const map = new Map<ChatStaffChannel, ChatConversationListItem>();
    for (const item of conversations) {
      if (isChatStaffChannel(item.channel)) map.set(item.channel, item);
    }
    return map;
  }, [conversations]);

  useEffect(() => {
    if (!selectedChannel) {
      openingForRef.current = null;
      setActiveConversation(null);
      setOpeningChannel(false);
      return;
    }

    const existing = conversationByChannel.get(selectedChannel);
    if (existing) {
      setActiveConversation(existing);
      openingForRef.current = selectedChannel;
      setOpeningChannel(false);
      return;
    }

    if (openingForRef.current === selectedChannel) return;
    openingForRef.current = selectedChannel;

    let cancelled = false;
    setOpeningChannel(true);
    void openChannel
      .mutateAsync(selectedChannel)
      .then((created) => {
        if (!cancelled) setActiveConversation(created);
      })
      .catch((err) => {
        if (!cancelled) {
          openingForRef.current = null;
          toast?.error(toDisplayErrorMessage(err, 'No se pudo abrir el chat'));
          setSearchParams({}, { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setOpeningChannel(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChannel, conversationByChannel, openChannel, toast, setSearchParams]);

  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(
    activeConversation?.id ?? null,
    activeConversation?.id != null
  );

  useEffect(() => {
    if (activeConversation?.id != null) {
      markRead.mutate(activeConversation.id);
    }
  }, [activeConversation?.id, messagesData?.messages.length]);

  const openChannelView = (channel: ChatStaffChannel) => {
    setSearchParams({ channel }, { replace: false });
  };

  const backToChannels = () => {
    setSearchParams({}, { replace: false });
    setActiveConversation(null);
  };

  const channelList = (
    <div className="flex flex-col gap-2">
      {MEMBER_CHANNEL_ORDER.map((channel) => (
        <MemberChannelButton
          key={channel}
          channel={channel}
          item={conversationByChannel.get(channel)}
          selected={selectedChannel === channel}
          onSelect={() => openChannelView(channel)}
        />
      ))}
    </div>
  );

  const renderThreadBody = (channel: ChatStaffChannel) => {
    const meta = MEMBER_CHANNEL_META[channel];
    const conversation = activeConversation;
    const messages = messagesData?.messages ?? [];
    const messageCount = messages.length;
    const loadingThread = openingChannel || (conversation == null && openChannel.isPending);

    if (loadingThread || (loadingMessages && !messagesData)) {
      return <ChatBubbleSkeleton />;
    }
    if (conversation == null) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8">
          <EmptyState
            icon={MessageSquare}
            title="No se pudo abrir el chat"
            description="Vuelve a la lista de canales e inténtalo de nuevo."
            action={
              <Button size="sm" variant="secondary" onClick={backToChannels}>
                Volver
              </Button>
            }
          />
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8">
          <EmptyState
            variant="motivational"
            icon={MessageSquare}
            title={meta.emptyTitle}
            description={meta.emptyDescription}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </div>
      );
    }
    return (
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={messages}
        alignToBottom
        initialTopMostItemIndex={Math.max(0, messageCount - 1)}
        itemContent={(index, message) => {
          const prev = messages[index - 1];
          const showDay = !prev || !sameCalendarDay(prev.created_at, message.created_at);
          return (
            <div className="px-3 pt-1.5 sm:px-3.5">
              {showDay ? <DaySeparator iso={message.created_at} /> : null}
              <ChatBubble message={message} conversationId={conversation.id} />
            </div>
          );
        }}
        followOutput="smooth"
        className="h-full"
      />
    );
  };

  if (isPending) {
    return (
      <div className="page-stack-tight" aria-busy="true" aria-label="Cargando mensajes">
        <Skeleton className="mx-4 h-8 w-48" />
        <ListRowSkeleton rows={3} />
      </div>
    );
  }

  if (isError) {
    const detail = toDisplayErrorMessage(error, '');
    return (
      <div className="page-stack-tight">
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">con el gym</span>
            </>
          }
          subtitle="Elige con quién quieres hablar"
          action={<BackToDashboardLink />}
        />
        <EmptyState
          icon={MessageSquare}
          title="No se pudieron cargar los mensajes"
          description={
            detail && detail !== 'Error inesperado'
              ? detail
              : 'Revisa tu conexión e inténtalo de nuevo.'
          }
          action={
            <Button
              size="sm"
              variant="primary"
              className="min-h-[var(--touch-min)]"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const meta = selectedChannel ? MEMBER_CHANNEL_META[selectedChannel] : null;
  const messages = messagesData?.messages ?? [];
  const messageCount = messages.length;
  const loadingThread =
    selectedChannel != null &&
    (openingChannel || (activeConversation == null && openChannel.isPending));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:gap-3">
      <PageHeader
        compact
        title={
          selectedChannel ? (
            <>
              Chat con <span className="text-brand">{CHAT_CHANNEL_LABELS[selectedChannel]}</span>
            </>
          ) : (
            <>
              Mensajes <span className="text-brand">con el gym</span>
            </>
          )
        }
        subtitle={
          selectedChannel
            ? loadingMessages || loadingThread
              ? undefined
              : messageCount > 0
                ? `${messageCount} mensaje${messageCount !== 1 ? 's' : ''}`
                : meta?.description
            : 'Elige el chat: recepción, administración o entrenador'
        }
        action={
          <div className="flex items-center gap-2">
            {selectedChannel ? (
              <Button size="sm" variant="secondary" className="lg:hidden" onClick={backToChannels}>
                Canales
              </Button>
            ) : null}
            <BackToDashboardLink />
          </div>
        }
      />

      {/* Móvil / tablet: un panel a la vez */}
      <div className={clsx('lg:hidden', selectedChannel && 'hidden')}>{channelList}</div>

      {selectedChannel ? (
        <div className="member-chat-panel flex min-h-0 flex-col overflow-hidden border-0 bg-transparent lg:hidden">
          <div className="flex min-h-0 flex-1 flex-col">{renderThreadBody(selectedChannel)}</div>
          {activeConversation != null ? (
            <ChatComposer
              conversationId={activeConversation.id}
              placeholder={MEMBER_CHANNEL_META[selectedChannel].composer}
            />
          ) : null}
        </div>
      ) : null}

      {/* Escritorio: canales | hilo */}
      <div className="member-chat-shell hidden min-h-0 grid-cols-[minmax(240px,300px)_minmax(0,1fr)] gap-3 lg:grid">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200/70 bg-white/80 p-2 dark:border-zinc-800/80 dark:bg-zinc-900/50">
          <p className="px-2 py-2 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
            Canales
          </p>
          {channelList}
        </div>
        <div className="member-chat-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200/60 bg-gradient-to-b from-zinc-50/90 via-white/70 to-zinc-50/50 dark:border-zinc-800/70 dark:from-zinc-950 dark:via-zinc-950/85 dark:to-zinc-900/40">
          {selectedChannel ? (
            <>
              <div className="flex min-h-0 flex-1 flex-col">
                {renderThreadBody(selectedChannel)}
              </div>
              {activeConversation != null ? (
                <ChatComposer
                  conversationId={activeConversation.id}
                  placeholder={MEMBER_CHANNEL_META[selectedChannel].composer}
                />
              ) : null}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                compact
                icon={MessageSquare}
                title="Elige un canal"
                description="Recepción, administración o entrenador — cada uno es un chat aparte."
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const isStaff = user?.role != null && isStaffRole(user.role);

  if (isStaff) return <StaffChatView />;
  return <MemberChatView />;
}
