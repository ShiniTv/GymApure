import type { ReactNode } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button } from '../../components/ui';
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
    <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Dentro
          <span className="ml-1.5 text-zinc-400 tabular-nums">({insideCount})</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 px-0"
          onClick={onRefresh}
          aria-label="Actualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {tab === 'inside' && messageBanner && <div className="mb-2">{messageBanner}</div>}
      <div
        className={cn(
          'scroll-area divide-y divide-zinc-100 dark:divide-zinc-800',
          isCounterMode ? 'max-h-56' : 'max-h-72'
        )}
      >
        {inside.map((m) => (
          <div key={m.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                {m.full_name}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {m.cedula || 'Sin cédula'}
              </p>
            </div>
            <p className="shrink-0 text-[11px] font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
              {format(new Date(m.check_in_time), 'HH:mm', { locale: es })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 px-0"
              disabled={!m.cedula || actionLoading}
              loading={checkingOutCedula === m.cedula?.trim()}
              onClick={() => onRequestCheckout(m)}
              title={m.cedula ? 'Registrar salida' : 'Sin cédula registrada'}
              aria-label={`Salida de ${m.full_name}`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {inside.length === 0 && (
          <p className="py-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Nadie dentro ahora
          </p>
        )}
      </div>
    </div>
  );
}
