import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Toaster, toast as sonnerToast } from 'sonner';
import { useTheme } from './ThemeContext';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  /**
   * Async feedback: loading → success/error with verbo+objeto copy.
   * Prefer this for mutations on floor flows (acceso, cobro, registro).
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function show(message: string, variant: ToastVariant = 'info') {
  if (variant === 'success') sonnerToast.success(message);
  else if (variant === 'error') sonnerToast.error(message);
  else if (variant === 'warning') sonnerToast.warning(message);
  else sonnerToast(message);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  const api = useMemo<ToastContextValue>(
    () => ({
      toast: show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      warning: (message) => show(message, 'warning'),
      promise: (promise, messages) => {
        const tracked = Promise.resolve(promise);
        void sonnerToast.promise(tracked, {
          loading: messages.loading,
          success: messages.success,
          error: messages.error,
        });
        return tracked;
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster
        theme={theme === 'light' ? 'light' : 'dark'}
        position="top-center"
        richColors
        closeButton
        gap={8}
        toastOptions={{
          classNames: {
            toast:
              '!rounded-[var(--radius-card)] !border-border !bg-surface !text-text !shadow-elevated',
            title: '!text-sm !font-medium',
            description: '!text-text-secondary !text-xs',
            closeButton: '!bg-surface-raised !border-border !text-text-muted',
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function useToastOptional() {
  return useContext(ToastContext);
}
