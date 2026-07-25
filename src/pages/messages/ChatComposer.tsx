import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import { Button } from '../../components/ui';
import { fieldClassName } from '../../components/ui/Input';
import { useToastOptional } from '../../context/ToastContext';
import { useChatTyping } from '../../hooks/useChatTyping';
import { useSendChatMessage } from '../../hooks/queries/useChatQuery';
import { toDisplayErrorMessage } from '../../lib/api';
import { cn } from '../../lib/utils';

export function ChatComposer({
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
