import { Label, Input } from '../ui';
import type { EffortMode, LoadMode, SetPrescriptionRow } from '../../lib/setPrescription';
import { resizeSetPrescription } from '../../lib/setPrescription';
import { parsePositiveInt } from '../../lib/parseFormNumber';

interface SetPrescriptionEditorProps {
  sets: number;
  defaultReps: number;
  value: SetPrescriptionRow[];
  effort: EffortMode;
  load: LoadMode;
  onChange: (rows: SetPrescriptionRow[]) => void;
}

export function SetPrescriptionEditor({
  sets,
  defaultReps,
  value,
  effort,
  load,
  onChange,
}: SetPrescriptionEditorProps) {
  const rows = value.length === sets ? value : resizeSetPrescription(value, sets, defaultReps);
  const showLoad = load !== 'none';
  const loadLabel = load === 'plates' ? 'Placas' : 'Peso (kg)';
  const effortLabel = effort === 'time' ? 'Segundos' : 'Reps';

  const updateRow = (setNumber: number, patch: Partial<SetPrescriptionRow>) => {
    onChange(rows.map((row) => (row.set_number === setNumber ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-2">
      <Label>Por serie</Label>
      <div className="border-border overflow-hidden rounded-lg border">
        <div
          className={`text-text-muted bg-surface-overlay text-small grid gap-2 border-b px-2 py-1.5 font-semibold ${
            showLoad ? 'grid-cols-[2.5rem_1fr_1fr]' : 'grid-cols-[2.5rem_1fr]'
          }`}
        >
          <span>#</span>
          {showLoad ? <span>{loadLabel}</span> : null}
          <span>{effortLabel}</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.set_number}
            className={`border-border/60 grid items-center gap-2 border-b px-2 py-1.5 last:border-0 ${
              showLoad ? 'grid-cols-[2.5rem_1fr_1fr]' : 'grid-cols-[2.5rem_1fr]'
            }`}
          >
            <span className="text-text-muted text-xs font-semibold tabular-nums">
              {row.set_number}
            </span>
            {showLoad ? (
              <Input
                type="number"
                step={load === 'kg' ? '0.5' : '1'}
                min={0}
                placeholder="—"
                className="h-8 text-xs"
                value={load === 'plates' ? (row.plates ?? '') : (row.weight_kg ?? '')}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const parsed = raw === '' ? null : Number(raw);
                  const n = parsed != null && Number.isFinite(parsed) ? parsed : null;
                  if (load === 'plates') updateRow(row.set_number, { plates: n });
                  else updateRow(row.set_number, { weight_kg: n });
                }}
              />
            ) : null}
            <Input
              type="number"
              min={1}
              className="h-8 text-xs"
              value={row.reps}
              onChange={(e) => {
                updateRow(row.set_number, {
                  reps: parsePositiveInt(e.target.value, row.reps),
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
