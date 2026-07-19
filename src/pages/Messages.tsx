import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
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
  Modal,
  PageHeader,
  PaginationBar,
  SearchInput,
  Spinner,
  BackToDashboardLink,
  PageState,
} from '../components/ui';
import { fieldClassName } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../lib/api';
import { useToastOptional } from '../context/ToastContext';
import { isStaffRole } from '../lib/roles';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { Check, MessageSquare, Pencil, Send, Trash2, UserPlus, X } from 'lucide-react';
import clsx from 'clsx';

interface MemberChatOption {
  id: number;
  full_name: string;
  cedula: string | null;
}
function formatMessageTime(iso: string): string {
  try {
    return format(new Date(iso), 'd MMM, HH:mm', { locale: dateLocale });
  } catch {
    return iso;
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
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const side = resolveBubbleSide(message, user?.role);
  const isOutgoing = side === 'end';
  const isSystem = side === 'center';
  const manageable = canManageOwnMessage(message, user?.id, user?.role);
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
      <div className="my-1.5 flex w-full justify-center px-1">
        <div className="w-full max-w-md rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-center">
          <p className="text-[11px] leading-snug font-medium text-sky-700 dark:text-sky-300">
            {message.body}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-300">
            {formatMessageTime(message.created_at)}
          </p>
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
          <div
            className={clsx(
              'w-fit max-w-full rounded-xl px-3 py-2',
              isOutgoing
                ? 'brand-solid rounded-br-sm'
                : 'rounded-bl-sm border border-zinc-200/80 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
            )}
            onTouchStart={handleLongPressStart}
            onTouchEnd={clearLongPress}
            onTouchCancel={clearLongPress}
            onTouchMove={clearLongPress}
          >
            {!isOutgoing && message.sender_name && (
              <p className="mb-0.5 text-[10px] font-bold opacity-70">{message.sender_name}</p>
            )}
            <p className="text-xs leading-snug break-words whitespace-pre-wrap text-inherit sm:text-sm">
              {message.body}
            </p>
            <p
              className={clsx(
                'mt-1 text-right text-[10px]',
                isOutgoing ? 'opacity-70' : 'text-zinc-400 dark:text-zinc-300'
              )}
            >
              {formatMessageTime(message.created_at)}
              {message.edited_at ? ' · editado' : ''}
            </p>
          </div>
          {manageable && (
            <div
              className={clsx(
                'flex items-center gap-1',
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                }}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Editar mensaje"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sm:hidden">Editar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                }}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
                aria-label="Eliminar mensaje"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sm:hidden">Borrar</span>
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
}: {
  conversationId: number;
  disabled?: boolean;
}) {
  const [body, setBody] = useState('');
  const sendMessage = useSendChatMessage();
  const toast = useToastOptional();

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync({ conversationId, body: trimmed });
      setBody('');
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo enviar el mensaje'));
    }
  };

  return (
    <div className="shrink-0 border-t border-zinc-100 bg-white p-2.5 sm:p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex w-full min-w-0 items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
          }}
          placeholder="Escribe un mensaje…"
          rows={1}
          disabled={disabled || sendMessage.isPending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          className={cn(
            fieldClassName,
            'max-h-24 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl px-3 py-2.5 text-sm leading-5',
            'text-zinc-900 dark:text-white',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'caret-[var(--color-brand)]'
          )}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || !body.trim() || sendMessage.isPending}
          onClick={() => void handleSend()}
          className="mb-0.5 h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-xl p-0"
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
        'w-full rounded-lg border px-2.5 py-2 text-left transition-colors',
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
          <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-300">
            {item.member_cedula}
          </p>
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

  const conversationListPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2 border-b border-zinc-100 p-2.5 dark:border-zinc-800">
        <SearchInput
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder={isTrainer ? 'Buscar cliente…' : 'Buscar miembro…'}
        />
        <button
          type="button"
          onClick={() => {
            setExpiringOnly((v) => !v);
          }}
          className={clsx(
            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
            expiringOnly
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'
          )}
        >
          Por vencer ({alertDays}d)
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-2">
        {loadingList ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : conversations.length === 0 && startableMembers.length === 0 && !memberHitsLoading ? (
          <EmptyState
            icon={MessageSquare}
            title={search.trim() ? 'Sin resultados' : 'Sin conversaciones'}
            description={
              search.trim()
                ? 'No hay chats ni miembros que coincidan. Prueba otro nombre o cédula.'
                : isTrainer
                  ? 'Aparecen cuando un cliente tuyo escribe o cuando abres el chat desde aquí buscando su nombre.'
                  : 'Busca un miembro arriba para iniciar un chat, o espera avisos automáticos.'
            }
          />
        ) : (
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
                      {member.cedula && (
                        <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                          {member.cedula}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {memberHitsLoading && conversations.length === 0 && (
              <div className="flex justify-center py-4">
                <Spinner size="xs" />
              </div>
            )}
            {conversations.length > 0 ? (
              <>
                <Virtuoso
                  style={{ flex: 1, height: '100%' }}
                  data={conversations}
                  itemContent={(_index, item) => (
                    <div className="pb-1">
                      <ConversationListItem
                        item={item}
                        selected={item.id === selectedId}
                        alertDays={alertDays}
                        onSelect={() => {
                          handleSelectConversation(item.id);
                        }}
                      />
                    </div>
                  )}
                />
                {conversationsTotal > conversationsPageSize && (
                  <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
                    <PaginationBar
                      page={listPage}
                      pageSize={conversationsPageSize}
                      total={conversationsTotal}
                      onPageChange={setListPage}
                    />
                  </div>
                )}
              </>
            ) : null}
          </>
        )}{' '}
      </div>
    </div>
  );

  const chatPanel = selected ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleBackToList}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
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
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{selected.member_cedula}</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {loadingMessages && !messagesData ? (
          <div className="flex flex-1 justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%', flex: 1 }}
            data={messagesData?.messages ?? []}
            itemContent={(_index, message) => (
              <div className="px-2.5 sm:px-3">
                <ChatBubble message={message} conversationId={selected.id} />
              </div>
            )}
            followOutput="smooth"
            className="h-full"
          />
        )}
      </div>
      <ChatComposer conversationId={selected.id} />
    </div>
  ) : null;

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={
          <>
            Mensajes <span className="text-brand">del gym</span>
          </>
        }
        subtitle={
          isTrainer
            ? 'Solo clientes con rutina asignada por ti'
            : 'Chat con clientes y avisos del gym'
        }
        action={<BackToDashboardLink />}
      />

      <div className="staff-chat-shell flex min-h-0 flex-col gap-2.5 sm:gap-3 lg:grid lg:h-[calc(100dvh-11.5rem)] lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <div
          className={clsx(
            showChatOnMobile && selected ? 'hidden lg:flex' : 'flex',
            'min-h-0 flex-1 flex-col lg:h-full lg:flex-none'
          )}
        >
          {conversationListPanel}
        </div>
        <div
          className={clsx(
            !showChatOnMobile || !selected ? 'hidden lg:flex' : 'flex',
            'min-h-0 flex-1 flex-col lg:h-full lg:flex-none'
          )}
        >
          {chatPanel ?? (
            <div className="hidden h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 lg:flex dark:border-zinc-800 dark:bg-zinc-900">
              <EmptyState
                icon={MessageSquare}
                title="Selecciona una conversación"
                description="Elige un miembro de la lista."
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberChatView() {
  const { data: conversation, isPending, isError, isFetching, refetch } = useMemberChatQuery(true);
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
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando mensajes…</p>
      </PageState>
    );
  }

  if (isError || conversation == null) {
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
              ? 'Revisa tu conexión e inténtalo de nuevo.'
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

  const messageCount = messagesData?.messages.length ?? 0;

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

      {!loadingMessages && messageCount > 0 && (
        <p className="px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {messageCount} mensaje{messageCount !== 1 ? 's' : ''}
        </p>
      )}

      <div className="member-chat-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white lg:h-[calc(100dvh-11rem)] dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex min-h-0 flex-1 flex-col">
          {loadingMessages && !messagesData ? (
            <div className="flex flex-1 justify-center py-8">
              <Spinner />
            </div>
          ) : messagesData && messagesData.messages.length === 0 ? (
            <div className="flex h-full min-h-[10rem] flex-col items-center justify-center px-4 py-6 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                Sin mensajes aún
              </p>
              <p className="mt-1 max-w-xs text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                Cuando haya avisos o respuestas del staff, aparecerán aquí.
              </p>
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: '100%' }}
              data={messagesData?.messages ?? []}
              itemContent={(_index, message) => (
                <div className="px-2.5 pt-2.5 sm:px-3">
                  <ChatBubble message={message} conversationId={conversation.id} />
                </div>
              )}
              followOutput="smooth"
              className="h-full"
            />
          )}
        </div>
        <ChatComposer conversationId={conversation.id} />
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
