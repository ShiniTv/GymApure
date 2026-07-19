import type { ReactNode } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Card } from '../../components/ui';
import { cn } from '../../lib/utils';
import type { InsideMember, ReceptionTab } from './types';

interface ReceptionInsideListProps {
  inside: InsideMember[];
  insideCount: number;
  tab: ReceptionTab;
  isCounterMode: boolean;
  actionLoading: boolean;
  checkingOutCedula: string | null;
  messageBanner: ReactNode;
  onRefresh: () => void;
  onRequestCheckout: (member: InsideMember) => void;
}

export function ReceptionInsideList({
  inside,
  insideCount,
  tab,
  isCounterMode,
  actionLoading,
  checkingOutCedula,
  messageBanner,
  onRefresh,
  onRequestCheckout,
}: ReceptionInsideListProps) {
  return (
    <Card padding="md" rounded="xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Dentro del gym ({insideCount})</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          onClick={onRefresh}
          aria-label="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {tab === 'inside' && messageBanner && <div className="mb-3">{messageBanner}</div>}
      <div className={cn('scroll-area space-y-2', isCounterMode ? 'max-h-56' : 'max-h-72')}>
        {inside.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {m.full_name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.cedula || 'Sin cédula'}</p>
            </div>
            <p className="shrink-0 text-xs font-medium text-emerald-600">
              {format(new Date(m.check_in_time), 'HH:mm', { locale: es })}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-xs"
              disabled={!m.cedula || actionLoading}
              loading={checkingOutCedula === m.cedula?.trim()}
              onClick={() => onRequestCheckout(m)}
              title={m.cedula ? 'Registrar salida' : 'Sin cédula registrada'}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salida</span>
            </Button>
          </div>
        ))}
        {inside.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-300">
            Nadie dentro en este momento
          </p>
        )}
      </div>
    </Card>
  );
}
