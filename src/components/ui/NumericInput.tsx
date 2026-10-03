import { forwardRef, useState, useCallback, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { fieldClassName } from './Input';

type NumericValue = number | '';

interface NumericInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  /** Current numeric value. Can be '' to represent an empty/clearing state. */
  value: number;
  /** Called with the parsed number or '' when the field is empty. */
  onChange: (value: NumericValue) => void;
  /** Called on blur with the finalized number (never empty). */
  onCommit?: (value: number) => void;
  /** Minimum allowed value. Defaults to 0. */
  min?: number;
  /** Step for increment buttons. */
  step?: string;
  /** Fallback value used when user leaves field empty. */
  fallback?: number;
}

/**
 * Mobile-friendly numeric input that allows clearing the field with backspace.
 *
 * Standard `<input type="number">` with `parsePositiveInt` immediately snaps
 * the value back when the field is empty, making it impossible to clear on
 * mobile keyboards. This component uses a local string state to allow
 * intermediate empty states, then commits on blur.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  { value, onChange, onCommit, min = 0, step, fallback, className, ...props },
  ref
) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused (external value updates)
  const displayValue = focused ? localValue : String(value);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      setLocalValue(String(value));
      // Select all text on focus so mobile users can immediately type a new value
      e.target.select();
      props.onFocus?.(e);
    },
    [value, props.onFocus]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);

      if (raw.trim() === '') {
        onChange('');
        return;
      }

      const parsed = step?.includes('.') ? parseFloat(raw) : parseInt(raw, 10);

      if (Number.isFinite(parsed)) {
        if (parsed >= min) {
          onChange(parsed);
        }
      }
    },
    [onChange, min, step]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const raw = localValue.trim();
      const resolvedFallback = fallback ?? (min > 0 ? min : 1);

      let finalValue: number;
      if (raw === '') {
        finalValue = resolvedFallback;
      } else {
        const parsed = step?.includes('.') ? parseFloat(raw) : parseInt(raw, 10);
        finalValue = Number.isFinite(parsed) && parsed >= min ? parsed : resolvedFallback;
      }

      setLocalValue(String(finalValue));
      onChange(finalValue);
      onCommit?.(finalValue);
      props.onBlur?.(e);
    },
    [localValue, fallback, min, step, onChange, onCommit, props.onBlur]
  );

  return (
    <input
      ref={ref}
      type="number"
      inputMode="numeric"
      min={min}
      step={step}
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(fieldClassName, className)}
      {...props}
    />
  );
});

NumericInput.displayName = 'NumericInput';
