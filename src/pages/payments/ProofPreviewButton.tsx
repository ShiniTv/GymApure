import { type MouseEvent } from 'react';
import { FileImage } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ProofPreviewButton({
  onClick,
  className,
}: {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        'text-brand hover:bg-brand/10 border-border inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
        className
      )}
      aria-label="Ver comprobante"
    >
      <FileImage className="h-4 w-4" />
    </button>
  );
}
