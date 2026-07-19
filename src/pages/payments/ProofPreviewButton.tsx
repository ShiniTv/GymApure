import { FileImage } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ProofPreviewButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-brand hover:bg-brand/10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 transition-colors dark:border-zinc-700',
        className
      )}
      aria-label="Ver comprobante"
    >
      <FileImage className="h-4 w-4" />
    </button>
  );
}
