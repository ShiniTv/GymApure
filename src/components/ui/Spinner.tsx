import { cn } from '../../lib/utils';

const sizeMap = {
  xs: 'h-6 w-6 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-10 w-10 border-[3px]',
  '2xl': 'h-14 w-14 border-[4px]',
} as const;

interface SpinnerProps {
  size?: keyof typeof sizeMap;
  className?: string;
}

export function Spinner({ size = 'lg', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'border-brand animate-spin rounded-full border-t-transparent',
        sizeMap[size],
        className
      )}
      role="status"
      aria-label="Cargando"
    />
  );
}
