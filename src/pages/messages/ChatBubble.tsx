import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Check, CheckCheck, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { useToastOptional } from '../../context/ToastContext';
import {
  useDeleteChatMessage,
  useEditChatMessage,
  useSendChatMessage,
  type ChatMessage,
} from '../../hooks/queries/useChatQuery';
import { Button, IconButton, Modal } from '../../components/ui';
import { fieldClassName } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { toDisplayErrorMessage } from '../../lib/api';
import {
  canManageOwnMessage,
  formatMessageDay,
  formatMessageTime,
  getMessageAttachment,
  resolveBubbleSide,
  resolveChatAttachmentSrc,
  systemMessageAction,
} from './chatFormat';

export function DaySeparator({ iso }: { iso: string }) {
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

export const ChatBubble = memo(function ChatBubble({
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
              <IconButton
                size="sm"
                variant="tertiary"
                onClick={() => {
                  setIsEditing(true);
                  setActionsOpen(false);
                }}
                aria-label="Editar mensaje"
              >
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                variant="danger"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setActionsOpen(false);
                }}
                aria-label="Eliminar mensaje"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
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
