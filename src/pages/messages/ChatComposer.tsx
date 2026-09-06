import { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, Send, X } from 'lucide-react';
import { Button } from '../../components/ui';
import { fieldClassName } from '../../components/ui/Input';
import { useToastOptional } from '../../context/ToastContext';
import { useChatTyping } from '../../hooks/useChatTyping';
import { useSendChatMessage } from '../../hooks/queries/useChatQuery';
import { toDisplayErrorMessage } from '../../lib/api';
import { cn } from '../../lib/utils';

const CHAT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

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
  const isPdf = file?.type === 'application/pdf';

  useEffect(() => {
    if (!file || file.type === 'application/pdf') {
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
    <div className="border-border/80 sm:bg-surface shrink-0 border-t bg-transparent px-2 py-2 sm:px-3">
      {typingLabel ? (
        <p className="text-text-muted mb-1.5 px-1 text-xs italic">{typingLabel}</p>
      ) : null}
      {quickReplies.length > 0 && !body && !file ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={disabled}
              onClick={() => setBody(reply)}
              className="border-border bg-surface-raised text-text-secondary hover:bg-surface-overlay rounded-full border px-2.5 py-1 text-xs"
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}
      {file ? (
        <div className="border-border bg-surface-raised mb-2 flex items-center gap-2 rounded-xl border p-2">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa"
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="bg-brand/10 text-brand flex h-10 w-10 items-center justify-center rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-text truncate text-xs font-medium">{file.name}</p>
            <p className="text-text-muted text-small">
              {isPdf ? 'PDF · máx. 5 MB' : 'Se enviará con el mensaje'}
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-text-muted hover:bg-surface-overlay inline-flex h-8 w-8 items-center justify-center rounded-lg"
            aria-label="Quitar adjunto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={CHAT_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            if (!next) return;
            if (next.size > 5 * 1024 * 1024) {
              toast?.error('El adjunto no puede superar 5 MB');
              return;
            }
            const ok =
              next.type.startsWith('image/') ||
              next.type === 'application/pdf' ||
              next.name.toLowerCase().endsWith('.pdf');
            if (!ok) {
              toast?.error('Usa JPG, PNG, WebP o PDF');
              return;
            }
            setFile(next);
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
          aria-label="Adjuntar imagen o PDF"
        >
          <Paperclip className="h-4 w-4" />
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
            'border-border/80 max-h-24 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-full px-3.5 py-2 text-sm leading-5',
            'bg-surface-raised text-text',
            'placeholder:text-text-muted',
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
