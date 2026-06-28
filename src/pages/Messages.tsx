import { useEffect, useRef, useState } from 'react';
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
import { Badge, Button, EmptyState, Modal, PageHeader, SearchInput, Spinner, BackToDashboardLink, PageState } from '../components/ui';
import { fieldClassName } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { toDisplayErrorMessage } from '../lib/api';
import { useToastOptional } from '../context/ToastContext';
import { isStaffRole } from '../lib/roles';
import { Check, MessageSquare, Pencil, Send, Trash2, X } from 'lucide-react';
import clsx from 'clsx';

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
  const senderIsStaff =
    message.sender_role != null && isStaffRole(message.sender_role);

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
  const isSender =
    message.sender_id != null && Number(message.sender_id) === Number(userId);
  if (!isSender && !message.is_mine) return false;
  return resolveBubbleSide(message, viewerRole) === 'end';
}

function ChatBubble({
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
  const side = resolveBubbleSide(message, user?.role);
  const isOutgoing = side === 'end';
  const isSystem = side === 'center';
  const manageable = canManageOwnMessage(message, user?.id, user?.role);
  const trimmedDraft = draft.trim();
  const canSave =
    trimmedDraft.length > 0 &&
    trimmedDraft !== message.body.trim() &&
    !editMessage.isPending;
  const previewBody =
    message.body.length > 120 ? `${message.body.slice(0, 120).trim()}…` : message.body;

  useEffect(() => {
    if (!isEditing) setDraft(message.body);
  }, [message.body, isEditing]);

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
      <div className="w-full flex justify-center my-1.5 px-1">
        <div className="w-full max-w-md rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-center">
          <p className="text-[11px] font-medium text-sky-700 dark:text-sky-300 leading-snug">{message.body}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{formatMessageTime(message.created_at)}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'w-full flex mb-1.5 px-0.5 group',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      {isEditing ? (
        <div
          className={clsx(
            'w-full rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm p-3',
            isOutgoing
              ? 'max-w-md border-brand/20 dark:border-brand/40'
              : 'max-w-md border-zinc-200 dark:border-zinc-700'
          )}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
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
          <div className="flex items-center justify-end gap-1.5 mt-2">
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg brand-solid brand-solid-hover disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Guardar cambios"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={clsx(
            'flex flex-col gap-1 max-w-[88%] sm:max-w-[72%]',
            isOutgoing ? 'items-end' : 'items-start'
          )}
        >
          {manageable && (
            <div
              className={clsx(
                'flex items-center gap-1',
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
              )}
            >
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Editar mensaje"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                aria-label="Eliminar mensaje"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div
            className={clsx(
              'rounded-xl px-3 py-2 w-fit max-w-full',
              isOutgoing
                ? 'brand-solid rounded-br-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-bl-sm'
            )}
          >
            {!isOutgoing && message.sender_name && (
              <p className="text-[10px] font-bold opacity-70 mb-0.5">{message.sender_name}</p>
            )}
            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-snug">{message.body}</p>
            <p
              className={clsx(
                'text-[10px] mt-1 text-right',
                isOutgoing ? 'opacity-70' : 'text-zinc-400'
              )}
            >
              {formatMessageTime(message.created_at)}
              {message.edited_at ? ' · editado' : ''}
            </p>
          </div>
        </div>
      )}

      <Modal
        open={showDeleteConfirm}
        onClose={() => !deleteMessage.isPending && setShowDeleteConfirm(false)}
        title="Eliminar mensaje"
        maxWidth="sm"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          ¿Eliminar este mensaje?
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2 line-clamp-3">
          «{previewBody}»
        </p>
        <p className="text-xs text-zinc-500 mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setShowDeleteConfirm(false)}
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
}

function ChatComposer({
  conversationId,
  disabled,
}: {
  conversationId: number;
  disabled?: boolean;
}) {
  const [body, setBody] = useState('');
  const sendMessage = useSendChatMessage();

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sendMessage.isPending) return;
    await sendMessage.mutateAsync({ conversationId, body: trimmed });
    setBody('');
  };

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 p-2.5 sm:p-3 bg-white dark:bg-zinc-900 shrink-0">
      <div className="flex h-11 gap-2 items-center w-full min-w-0">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
            'flex-1 min-w-0 !h-11 !min-h-11 !max-h-11 resize-none rounded-xl py-2 px-3 text-sm leading-5'
          )}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || !body.trim() || sendMessage.isPending}
          onClick={() => void handleSend()}
          className="shrink-0 h-11 w-11 min-h-11 min-w-11 rounded-xl p-0"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ConversationListItem({
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
        'w-full text-left px-2.5 py-2 rounded-lg border transition-colors',
        selected
          ? 'border-brand/40 bg-brand/5'
          : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{item.member_name}</p>
          <p className="text-[10px] text-zinc-400 truncate">{item.member_cedula}</p>
        </div>
        {item.unread_count > 0 && (
          <span className="nav-badge brand-solid shrink-0">
            {item.unread_count > 99 ? '99+' : item.unread_count}
          </span>
        )}
      </div>
      {item.last_message_preview && (
        <p className="text-xs text-zinc-500 mt-1 truncate">{item.last_message_preview}</p>
      )}
      {expiryBadge && (
        <Badge className={clsx('mt-2', expiryBadge.className)}>{expiryBadge.label}</Badge>
      )}
    </button>
  );
}

function StaffChatView() {
  const { user } = useAuth();
  const toast = useToastOptional();
  const isTrainer = user?.role === 'trainer';
  const [searchParams, setSearchParams] = useSearchParams();
  const adminStats = useAdminStatsOptional();
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const [search, setSearch] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const openWithMember = useOpenChatWithMember();
  const markRead = useMarkChatRead();
  const bottomRef = useRef<HTMLDivElement>(null);

  const memberParam = searchParams.get('member');
  const { data: conversations = [], isPending: loadingList } = useChatConversationsQuery(
    search,
    expiringOnly,
    true
  );
  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(selectedId, selectedId != null);

  useEffect(() => {
    if (!memberParam || openWithMember.isPending) return;
    const memberId = parseInt(memberParam, 10);
    if (!Number.isFinite(memberId)) return;

    void openWithMember.mutateAsync(memberId).then((conversation) => {
      setSelectedId(conversation.id);
      setSearchParams({}, { replace: true });
    }).catch((err) => {
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
      void markRead.mutate(selectedId);
    }
  }, [selectedId, messagesData?.messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={<>Mensajes <span className="text-brand">del gym</span></>}
        subtitle={
          isTrainer
            ? 'Solo clientes con rutina asignada por ti'
            : 'Chat con clientes y avisos del gym'
        }
        action={<BackToDashboardLink />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] gap-2.5 sm:gap-3 h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-11.5rem)] max-h-[720px]">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden min-h-[240px]">
          <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTrainer ? 'Buscar cliente…' : 'Buscar miembro…'}
            />
            <button
              type="button"
              onClick={() => setExpiringOnly((v) => !v)}
              className={clsx(
                'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
                expiringOnly
                  ? 'border-brand/40 bg-brand/10 text-brand'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
              )}
            >
              Por vencer ({alertDays}d)
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Sin conversaciones"
                description={
                  isTrainer
                    ? 'Aparecen cuando un cliente tuyo escribe o cuando abres el chat desde Miembros.'
                    : 'Los chats se crean al enviar un mensaje o cuando hay avisos automáticos.'
                }
              />
            ) : (
              conversations.map((item) => (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  alertDays={alertDays}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden min-h-[280px] lg:min-h-0 lg:h-full">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <EmptyState
                icon={MessageSquare}
                title="Selecciona una conversación"
                description="Elige un miembro de la lista."
                className="border-0 shadow-none bg-transparent p-0"
              />
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{selected.member_name}</p>
                <p className="text-[10px] text-zinc-500">{selected.member_cedula}</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 sm:px-3">
                {loadingMessages && !messagesData ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : (
                  messagesData?.messages.map((message) => (
                    <ChatBubble key={message.id} message={message} conversationId={selected.id} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <ChatComposer conversationId={selected.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberChatView() {
  const { data: conversation, isPending } = useMemberChatQuery(true);
  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(
    conversation?.id ?? null,
    conversation?.id != null
  );
  const markRead = useMarkChatRead();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation?.id != null) {
      void markRead.mutate(conversation.id);
    }
  }, [conversation?.id, messagesData?.messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  if (isPending || !conversation) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-zinc-500 text-xs">Cargando mensajes…</p>
      </PageState>
    );
  }

  const messageCount = messagesData?.messages.length ?? 0;

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={<>Mensajes <span className="text-brand">con el gym</span></>}
        subtitle="Avisos de membresía, pagos y rutinas"
        action={<BackToDashboardLink />}
      />

      {!loadingMessages && messageCount > 0 && (
        <p className="text-[11px] text-zinc-500 px-0.5">
          {messageCount} mensaje{messageCount !== 1 ? 's' : ''}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-11rem)] max-h-[640px]">
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 sm:px-3">
          {loadingMessages && !messagesData ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : messagesData && messagesData.messages.length === 0 ? (
            <div className="h-full min-h-[10rem] flex flex-col items-center justify-center text-center px-4 py-6">
              <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Sin mensajes aún</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-snug">
                Cuando haya avisos o respuestas del staff, aparecerán aquí.
              </p>
            </div>
          ) : (
            messagesData?.messages.map((message) => (
              <ChatBubble key={message.id} message={message} conversationId={conversation.id} />
            ))
          )}
          <div ref={bottomRef} />
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
