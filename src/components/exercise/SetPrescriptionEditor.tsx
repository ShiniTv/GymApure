import React from 'react';
import { Label, Input } from '../ui';
import type { SetPrescriptionRow } from '../../lib/setPrescription';
import { resizeSetPrescription } from '../../lib/setPrescription';
import { parsePositiveInt } from '../../lib/parseFormNumber';

interface SetPrescriptionEditorProps {
  sets: number;
  defaultReps: number;
  value: SetPrescriptionRow[];
  onChange: (rows: SetPrescriptionRow[]) => void;
}

export function SetPrescriptionEditor({
  sets,
  defaultReps,
  value,
  onChange,
}: SetPrescriptionEditorProps) {
  const rows = value.length === sets ? value : resizeSetPrescription(value, sets, defaultReps);

  const updateRow = (setNumber: number, patch: Partial<SetPrescriptionRow>) => {
    onChange(rows.map((row) => (row.set_number === setNumber ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-2">
      <Label>Prescripción por serie</Label>
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-2 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
          <span>#</span>
          <span>Peso (kg)</span>
          <span>Reps</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.set_number}
            className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 border-b border-zinc-100 px-2 py-1.5 last:border-0 dark:border-zinc-800"
          >
            <span className="text-xs font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">
              {row.set_number}
            </span>
            <Input
              type="number"
              step="0.5"
              min={0}
              placeholder="—"
              className="h-8 text-xs"
              value={row.weight_kg ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                updateRow(row.set_number, {
                  weight_kg: raw === '' ? null : Number.isFinite(Number(raw)) ? Number(raw) : null,
                });
              }}
            />
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
