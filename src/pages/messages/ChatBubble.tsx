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
      <div className="bg-border/70 h-px flex-1" />
      <span className="text-text-muted text-small shrink-0 font-medium tracking-wide">
        {formatMessageDay(iso)}
      </span>
      <div className="bg-border/70 h-px flex-1" />
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
          <p className="bg-surface-raised text-text-secondary text-small rounded-2xl px-3 py-1.5 leading-snug">
            {message.body}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
            <p className="text-text-muted text-small tabular-nums">
              {formatMessageTime(message.created_at)}
            </p>
            {systemAction ? (
              <Link
                to={systemAction.to}
                className="text-brand text-small font-semibold hover:underline"
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
            'bg-surface w-full rounded-2xl border p-3',
            isOutgoing ? 'border-brand/20 max-w-md' : 'border-border max-w-md'
          )}
        >
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            rows={3}
            className={cn(fieldClassName, 'text-text min-h-[88px] w-full resize-none text-sm')}
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
              className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-8 w-8 items-center justify-center rounded-lg"
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
            <p className="text-text-muted text-small px-1 font-medium">{message.sender_name}</p>
          ) : null}
          <button
            type="button"
            className={clsx(
              'w-fit max-w-full rounded-2xl px-3 py-2 text-left transition-opacity',
              isOutgoing
                ? 'brand-solid rounded-br-md text-white'
                : 'border-border/60 bg-surface text-text rounded-bl-md border',
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
              attachment?.mime === 'application/pdf' ||
              attachment?.name?.toLowerCase().endsWith('.pdf') ? (
                <a
                  href={attachmentSrc}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={clsx(
                    'mb-1.5 flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium',
                    isOutgoing ? 'bg-white/15 text-white' : 'bg-surface-raised text-text'
                  )}
                >
                  <span className="truncate">{attachment?.name || 'Documento PDF'}</span>
                </a>
              ) : (
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
              )
            ) : null}
            {showCaption || !attachmentSrc ? (
              <p className="text-sm leading-snug break-words whitespace-pre-wrap text-inherit">
                {message.body}
              </p>
            ) : null}
            <p
              className={clsx(
                'text-small mt-0.5 flex items-center justify-end gap-1 tabular-nums',
                isOutgoing ? 'text-white/70' : 'text-text-muted'
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
        <p className="text-text-secondary mb-2 text-sm">¿Eliminar este mensaje?</p>
        <p className="text-text-muted mb-2 line-clamp-3 text-xs">«{previewBody}»</p>
        <p className="text-text-muted mb-6 text-xs">Esta acción no se puede deshacer.</p>
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
