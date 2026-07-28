import { Spinner } from '../../components/ui';

export function PanelFallback() {
  return (
    <div
      className="flex min-h-32 items-center justify-center"
      role="status"
      aria-label="Cargando panel"
    >
      <Spinner />
    </div>
  );
}
