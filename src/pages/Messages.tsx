import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
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
  useSendChatMessage,
  type ChatConversationListItem,
  type ChatMessage,
} from '../hooks/queries/useChatQuery';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { getExpiryBadgeInfo } from '../lib/expiryUtils';
import {
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
import { Check, MessageSquare, Pencil, RotateCcw, Send, Trash2, UserPlus, X } from 'lucide-react';
import clsx from 'clsx';

interface MemberChatOption {
  id: number;
  full_name: string;
  cedula: string | null;
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
            aria-label={manageable ? 'Mensaje, toca para opciones' : undefined}
          >
            <p className="text-[13px] leading-snug break-words whitespace-pre-wrap text-inherit sm:text-sm">
              {message.body}
            </p>
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
                  {isOutgoing ? <Check className="h-3 w-3 opacity-80" aria-hidden /> : null}
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
}: {
  conversationId: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [body, setBody] = useState('');
  const sendMessage = useSendChatMessage();
  const toast = useToastOptional();

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || disabled) return;
    setBody('');
    void sendMessage.mutateAsync({ conversationId, body: trimmed }).catch((err) => {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo enviar el mensaje'));
    });
  };

  return (
    <div className="shrink-0 border-t border-zinc-100/80 bg-transparent px-2 py-2 sm:bg-white sm:px-3 dark:border-zinc-800/80 dark:sm:bg-zinc-900">
      <div className="flex w-full min-w-0 items-center gap-2">
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
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
          disabled={disabled || !body.trim()}
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {item.member_name}
          </p>
          {item.member_cedula ? (
            <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-300">
              {item.member_cedula}
            </p>
          ) : null}
        </div>
        {item.unread_count > 0 && (
          <span className="nav-badge brand-solid shrink-0">
            {item.unread_count > 99 ? '99+' : item.unread_count}
          </span>
        )}
      </div>
      {item.last_message_preview && (
        <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {item.last_message_preview}
        </p>
      )}
      {expiryBadge && (
        <Badge className={clsx('mt-2', expiryBadge.className)}>{expiryBadge.label}</Badge>
      )}
    </button>
  );
});

function StaffChatView() {
  usePageTitle('Mensajes');
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const isTrainer = user?.role === 'trainer';
  const [searchParams, setSearchParams] = useSearchParams();
  const adminStats = useAdminStatsOptional();
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const [search, setSearch] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [memberHits, setMemberHits] = useState<MemberChatOption[]>([]);
  const [memberHitsLoading, setMemberHitsLoading] = useState(false);
  const openWithMember = useOpenChatWithMember();
  const markRead = useMarkChatRead();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const memberParam = searchParams.get('member');
  const { data: conversationsPage, isPending: loadingList } = useChatConversationsQuery(
    search,
    expiringOnly,
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
  }, [search, expiringOnly]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 2 || expiringOnly) {
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
  }, [debouncedSearch, expiringOnly]);

  const startChatWithMember = useCallback(
    (memberId: number) => {
      void openWithMember
        .mutateAsync(memberId)
        .then((conversation) => {
          setSelectedId(conversation.id);
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
    }
  }, [conversations, selectedId, memberParam]);

  useEffect(() => {
    if (selectedId != null) {
      markRead.mutate(selectedId);
    }
  }, [selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const handleSelectConversation = (id: number) => {
    setSelectedId(id);
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
          title={search.trim() ? 'Sin resultados' : 'Sin conversaciones'}
          description={
            search.trim()
              ? 'No hay chats ni miembros que coincidan. Prueba otro nombre o cédula.'
              : isTrainer
                ? 'Aparecen cuando un cliente tuyo escribe o cuando abres el chat desde aquí buscando su nombre.'
                : 'Busca un miembro arriba para iniciar un chat, o espera avisos automáticos.'
          }
          action={
            isTrainer && !search.trim() ? (
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          containerClassName="min-w-0 flex-1"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder={isTrainer ? 'Buscar cliente…' : 'Buscar miembro…'}
        />
        <FilterChips
          className="w-fit max-w-full shrink-0"
          options={[
            { value: '', label: 'Todos' },
            { value: 'expiring', label: `Por vencer (${alertDays}d)` },
          ]}
          value={expiringOnly ? 'expiring' : ''}
          onChange={(v) => setExpiringOnly(v === 'expiring')}
        />
      </div>
    </div>
  );

  const staffMessages = messagesData?.messages ?? [];

  const chatThread = selected ? (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-100/80 px-2 py-2 sm:px-3 dark:border-zinc-800/80">
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {selected.member_name}
          </p>
          {selected.member_cedula ? (
            <p className="hidden truncate text-[10px] text-zinc-500 sm:block dark:text-zinc-400">
              {selected.member_cedula}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {loadingMessages && !messagesData ? (
          <ChatBubbleSkeleton />
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%', width: '100%' }}
            className="absolute inset-0"
            data={staffMessages}
            itemContent={(index, message) => {
              const prev = staffMessages[index - 1];
              const showDay = !prev || !sameCalendarDay(prev.created_at, message.created_at);
              return (
                <div className="px-2.5 pt-1 sm:px-3">
                  {showDay ? <DaySeparator iso={message.created_at} /> : null}
                  <ChatBubble message={message} conversationId={selected.id} />
                </div>
              );
            }}
            followOutput="smooth"
          />
        )}
      </div>
      <ChatComposer conversationId={selected.id} />
    </>
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <EmptyState
        compact
        icon={MessageSquare}
        title="Selecciona una conversación"
        description="Elige un miembro de la lista."
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </div>
  );

  const threadOpenOnMobile = showChatOnMobile && selected != null;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      {/* —— Móvil: lista con scroll de página (sin Virtuoso / sin altura 0) —— */}
      <div className={clsx('space-y-3 md:hidden', threadOpenOnMobile && 'hidden')}>
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">del gym</span>
            </>
          }
          subtitle={isTrainer ? undefined : 'Chat con clientes y avisos del gym'}
          action={<BackToDashboardLink />}
        />
        {listToolbar}
        <div className="space-y-0.5 pb-2">{renderConversationListBody()}</div>
      </div>

      {/* —— Móvil: hilo a pantalla útil —— */}
      {threadOpenOnMobile ? (
        <div className="staff-chat-mobile-thread flex flex-col overflow-hidden md:hidden">
          {chatThread}
        </div>
      ) : null}

      {/* —— Tablet / escritorio: dos paneles —— */}
      <div className="hidden md:block">
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">del gym</span>
            </>
          }
          subtitle={isTrainer ? undefined : 'Chat con clientes y avisos del gym'}
          action={<BackToDashboardLink />}
        />
        <div className="staff-chat-shell mt-0 grid min-h-0 grid-cols-[minmax(240px,300px)_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
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
        </div>
      </div>
    </div>
  );
}

function MemberChatView() {
  usePageTitle('Mensajes');
  const {
    data: conversation,
    isPending,
    isError,
    isFetching,
    error,
    refetch,
  } = useMemberChatQuery(true);
  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(
    conversation?.id ?? null,
    conversation?.id != null
  );
  const markRead = useMarkChatRead();
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  useEffect(() => {
    if (conversation?.id != null) {
      markRead.mutate(conversation.id);
    }
  }, [conversation?.id, messagesData?.messages.length]);

  if (isPending) {
    return (
      <div className="page-stack-tight" aria-busy="true" aria-label="Cargando mensajes">
        <Skeleton className="mx-4 h-8 w-48" />
        <ChatBubbleSkeleton rows={8} />
      </div>
    );
  }

  if (isError || conversation == null || !Number.isFinite(Number(conversation.id))) {
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
          subtitle="Avisos de membresía, pagos y rutinas"
          action={<BackToDashboardLink />}
        />
        <EmptyState
          icon={MessageSquare}
          title={isError ? 'No se pudieron cargar los mensajes' : 'Sin chat disponible'}
          description={
            isError
              ? detail && detail !== 'Error inesperado'
                ? detail
                : 'Revisa tu conexión e inténtalo de nuevo.'
              : 'Aún no tienes conversación con el gym. Contacta recepción si necesitas ayuda.'
          }
          action={
            <Button
              size="sm"
              variant={isError ? 'primary' : 'secondary'}
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

  const messages = messagesData?.messages ?? [];
  const messageCount = messages.length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:gap-3 lg:max-w-4xl">
      <PageHeader
        compact
        title={
          <>
            Mensajes <span className="text-brand">con el gym</span>
          </>
        }
        subtitle={
          loadingMessages
            ? undefined
            : messageCount > 0
              ? `${messageCount} mensaje${messageCount !== 1 ? 's' : ''}`
              : undefined
        }
        action={<BackToDashboardLink />}
      />

      <div className="member-chat-panel flex min-h-0 flex-col overflow-hidden border-0 bg-transparent lg:rounded-2xl lg:border lg:border-zinc-200/60 lg:bg-gradient-to-b lg:from-zinc-50/90 lg:via-white/70 lg:to-zinc-50/50 dark:lg:border-zinc-800/70 dark:lg:from-zinc-950 dark:lg:via-zinc-950/85 dark:lg:to-zinc-900/40">
        <div className="flex min-h-0 flex-1 flex-col">
          {loadingMessages && !messagesData ? (
            <ChatBubbleSkeleton />
          ) : messagesData && messages.length === 0 ? (
            <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8">
              <EmptyState
                variant="motivational"
                icon={MessageSquare}
                title="Tu bandeja con el gym"
                description="Aquí verás avisos de membresía y pagos. También puedes escribirle al staff desde abajo."
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          ) : (
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
          )}
        </div>
        <ChatComposer conversationId={conversation.id} placeholder="Escribe a recepción…" />
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
