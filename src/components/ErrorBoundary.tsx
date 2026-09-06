import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\dA-Za-z_-]+ failed/i;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      isChunkError: CHUNK_ERROR_RE.test(`${error.name}: ${error.message}`),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error);
    if (typeof console !== 'undefined') {
      console.error('Component stack:', errorInfo.componentStack);
    }
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    if (this.state.isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[40dvh] items-center justify-center p-4">
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <div className="rounded-[var(--radius-card)] bg-red-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-text text-h2 font-semibold">Algo salió mal</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              Ocurrió un error inesperado al cargar esta sección. Por favor, intenta recargar la
              página.
            </p>
            {import.meta.env.DEV && this.state.error?.message ? (
              <p className="max-w-full rounded-[var(--radius-card)] border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs break-words text-red-600 dark:text-red-400">
                {this.state.error.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={this.handleReset}
              className="bg-text text-bg inline-flex min-h-[var(--touch-min)] items-center gap-2 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              {this.state.isChunkError ? 'Recargar página' : 'Reintentar'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
