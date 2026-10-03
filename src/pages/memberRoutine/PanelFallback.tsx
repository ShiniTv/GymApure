import { Skeleton } from '../../components/ui';

export function PanelFallback() {
  return (
    <div className="space-y-3 p-1" role="status" aria-label="Cargando panel">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
