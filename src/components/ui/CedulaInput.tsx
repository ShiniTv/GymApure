import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { canonicalCedula, validateCedula } from '../../lib/cedulaUtils';
import { Input } from './Input';

interface CedulaInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  error?: string;
  onChange?: (value: string) => void;
  onValidation?: (error: string | null) => void;
  variant?: 'default' | 'kiosk';
  leadingIcon?: ReactNode;
}

export const CedulaInput = forwardRef<HTMLInputElement, CedulaInputProps>(function CedulaInput(
  { error: externalError, onChange, onValidation, variant = 'default', className, value, leadingIcon, ...props },
  forwardedRef
) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const innerRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(forwardedRef, () => innerRef.current!, []);

  const error = externalError ?? internalError ?? undefined;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.toUpperCase();
      onChange?.(raw);
      if (internalError) {
        const err = validateCedula(raw);
        setInternalError(err);
        onValidation?.(err);
      }
    },
    [onChange, internalError, onValidation]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim();
      if (!raw) {
        setInternalError(null);
        onValidation?.(null);
        return;
      }
      const canonical = canonicalCedula(raw);
      if (canonical && canonical !== raw) {
        onChange?.(canonical);
      }
      const err = validateCedula(raw);
      setInternalError(err);
      onValidation?.(err);
    },
    [onChange, onValidation]
  );

  useEffect(() => {
    if (externalError === undefined) return;
    if (externalError === null || externalError === '') {
      setInternalError(null);
    }
  }, [externalError]);

  if (variant === 'kiosk') {
    return (
      <div className="w-full">
        <input
          ref={innerRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          aria-label="Cédula de identidad"
          className={cn(
            'w-full text-center font-mono tracking-widest outline-none transition-all',
            'text-3xl md:text-4xl py-6 min-h-[80px] rounded-xl',
            'bg-zinc-900/50 border border-zinc-700 text-white',
            'focus:ring-2 focus:ring-brand/30 focus-visible:ring-2 focus-visible:ring-brand',
            error && 'border-red-500',
            className
          )}
          placeholder="V-00000000"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        {error && (
          <p className="text-xs font-medium text-red-500 mt-2 text-center" role="alert">{error}</p>
        )}
      </div>
    );
  }

  return (
    <Input
      ref={innerRef}
      type="text"
      inputMode="text"
      autoComplete="off"
      autoCapitalize="characters"
      className={cn('font-mono tracking-widest', className)}
      placeholder="V-00000000"
      error={error}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      leadingIcon={leadingIcon}
      {...props}
    />
  );
});

CedulaInput.displayName = 'CedulaInput';
