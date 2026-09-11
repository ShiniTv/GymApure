import { useState, useMemo, type ReactNode } from 'react';
import { LogOut, RefreshCw, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Badge, Input } from '../../components/ui';
import { hapticLight } from '../../lib/haptics';
import type { InsideMember, ReceptionTab } from './types';

interface ReceptionInsideListProps {
  inside: InsideMember[];
  insideCount: number;
  tab: ReceptionTab;
  actionLoading: boolean;
  checkingOutCedula: string | null;
  messageBanner: ReactNode;
  onRefresh: () => void;
  onRequestCheckout: (member: InsideMember) => void;
}

function getStayDuration(checkInTime: string): { label: string; mins: number } {
  const diffMs = Date.now() - new Date(checkInTime).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 60) {
    return { label: `${diffMins}m`, mins: diffMins };
  }
  const hours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return {
    label: remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`,
    mins: diffMins,
  };
}

export function ReceptionInsideList({
  inside,
  insideCount,
  tab,
  actionLoading,
  checkingOutCedula,
  messageBanner,
  onRefresh,
  onRequestCheckout,
}: ReceptionInsideListProps) {
  const [filter, setFilter] = useState('');

  const filteredMembers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return inside;
    return inside.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) || (m.cedula && m.cedula.toLowerCase().includes(q))
    );
  }, [inside, filter]);

  const handleCheckoutClick = (m: InsideMember) => {
    hapticLight();
    onRequestCheckout(m);
  };

  return (
    <div className="border-border/80 bg-surface rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-text text-xs font-semibold">
            Dentro
            <span className="text-text-muted ml-1.5 tabular-nums">({insideCount})</span>
          </h3>
          {insideCount > 0 && (
            <Badge variant="accent" className="text-small px-1.5 py-0">
              En sala
            </Badge>
          )}
        </div>
        <Button
          variant="secondary"
          size="md"
          className="tap-feedback w-11 px-0 active:scale-95"
          onClick={onRefresh}
          aria-label="Actualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {inside.length >= 4 && (
        <div className="relative mb-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            className="pr-8 text-xs"
          />
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="text-text-muted hover:text-text absolute top-1/2 right-2 -translate-y-1/2 p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Search className="text-text-muted pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          )}
        </div>
      )}

      {tab === 'inside' && messageBanner && <div className="mb-2">{messageBanner}</div>}

      <div className="divide-border/60 divide-y">
        {filteredMembers.map((m) => {
          const duration = getStayDuration(m.check_in_time);
          const isExtended = duration.mins >= 120;
          const isWarning = duration.mins >= 90 && !isExtended;

          return (
            <div key={m.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-text truncate text-sm font-semibold">{m.full_name}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-text-muted text-small">{m.cedula || 'Sin cédula'}</p>
                  <span className="text-border">·</span>
                  <p className="text-text-muted text-small tabular-nums">
                    {format(new Date(m.check_in_time), 'HH:mm', { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end">
                {isExtended ? (
                  <Badge variant="danger" className="text-small px-1.5 py-0 tabular-nums">
                    {duration.label}
                  </Badge>
                ) : isWarning ? (
                  <Badge variant="warning" className="text-small px-1.5 py-0 tabular-nums">
                    {duration.label}
                  </Badge>
                ) : (
                  <span className="text-small font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                    {duration.label}
                  </span>
                )}
              </div>

              <Button
                variant="secondary"
                size="md"
                className="tap-feedback w-11 shrink-0 px-0 active:scale-95"
                disabled={!m.cedula || actionLoading}
                loading={checkingOutCedula === m.cedula?.trim()}
                onClick={() => handleCheckoutClick(m)}
                title={m.cedula ? 'Registrar salida' : 'Sin cédula registrada'}
                aria-label={`Salida de ${m.full_name}`}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        {inside.length === 0 && (
          <p className="text-text-muted py-5 text-center text-xs">Nadie dentro ahora</p>
        )}

        {inside.length > 0 && filteredMembers.length === 0 && (
          <p className="text-text-muted py-4 text-center text-xs">
            Sin resultados para &ldquo;{filter}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
