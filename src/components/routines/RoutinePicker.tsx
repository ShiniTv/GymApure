import { useMemo, useRef, useState } from 'react';
import { formatDifficulty, cn } from '../../lib/utils';
import { Label, SearchInput } from '../ui';

export interface RoutinePickerOption {
  id: number;
  name: string;
  difficulty: string;
  trainer_name?: string;
}

interface RoutinePickerProps {
  routines: RoutinePickerOption[];
  value: string;
  onChange: (routineId: string) => void;
  label?: string;
  placeholder?: string;
  emptyHint?: string;
  assignedRoutineIds?: Set<number>;
  className?: string;
}

/** Searchable list to pick a routine — avoids long native selects. */
export function RoutinePicker({
  routines,
  value,
  onChange,
  label = 'Rutina',
  placeholder = 'Buscar plantilla…',
  emptyHint = 'Ninguna plantilla coincide',
  assignedRoutineIds,
  className,
}: RoutinePickerProps) {
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routines;
    return routines.filter((r) => {
      const hay =
        `${r.name} ${formatDifficulty(r.difficulty)} ${r.trainer_name ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [routines, search]);

  const selected = routines.find((r) => String(r.id) === value);

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <Label>{label}</Label> : null}
      <SearchInput
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label={placeholder}
      />
      {selected ? (
        <p className="text-small text-text-secondary">
          Seleccionada: <span className="text-text font-medium">{selected.name}</span>
          <span className="text-text-muted"> · {formatDifficulty(selected.difficulty)}</span>
        </p>
      ) : null}
      <div
        ref={listRef}
        role="listbox"
        aria-label="Plantillas"
        className="border-border bg-surface max-h-48 overflow-y-auto rounded-[var(--radius-input)] border"
      >
        {filtered.length === 0 ? (
          <p className="text-small text-text-muted px-3 py-4 text-center">{emptyHint}</p>
        ) : (
          <ul className="divide-border divide-y">
            {filtered.map((r) => {
              const id = String(r.id);
              const isSelected = value === id;
              const isReassign = assignedRoutineIds?.has(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onChange(id)}
                    className={cn(
                      'hover:bg-surface-overlay flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors',
                      isSelected && 'bg-brand/8'
                    )}
                  >
                    <span className="text-text truncate text-sm font-medium">{r.name}</span>
                    <span className="text-small text-text-muted">
                      {formatDifficulty(r.difficulty)}
                      {r.trainer_name ? ` · ${r.trainer_name}` : ''}
                      {isReassign ? ' · reasignar' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {search.trim() ? (
        <p className="text-small text-text-muted">
          {filtered.length} coincidencia{filtered.length !== 1 ? 's' : ''}
        </p>
      ) : null}
    </div>
  );
}
