import React, { FormEvent } from 'react';
import { format } from 'date-fns';
import { Plus, Scale, Ruler, Trash2 } from 'lucide-react';
import { dateLocale as es } from '../../lib/dateLocale';
import { Button, Input, Label, Modal } from '../../components/ui';
import type { Measurement } from './types';

export interface MeasurementFormValue {
  date: string;
  weight: string;
  body_fat_percentage: string;
  waist: string;
  arm: string;
  leg: string;
}

interface MemberMeasurementsPanelProps {
  measurements: Measurement[];
  canEdit: boolean;
  isAdding: boolean;
  form: MeasurementFormValue;
  onAddingChange: (open: boolean) => void;
  onFormChange: (value: MeasurementFormValue) => void;
  onSubmit: (event: FormEvent) => void;
  onDelete?: (id: number) => Promise<void>;
}

export function MemberMeasurementsPanel({
  measurements,
  canEdit,
  isAdding,
  form,
  onAddingChange,
  onFormChange,
  onSubmit,
  onDelete,
}: MemberMeasurementsPanelProps) {
  const latest = measurements[0] ?? null;

  // Deltas en tiempo real en modal
  const numWeight = parseFloat(form.weight);
  const weightDelta =
    !isNaN(numWeight) && latest?.weight != null
      ? Math.round((numWeight - latest.weight) * 10) / 10
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand/10 text-brand border-brand/20 flex h-9 w-9 items-center justify-center rounded-xl border">
            <Scale className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-text text-base font-semibold tracking-tight">
              Seguimiento Biométrico
            </h2>
            <p className="text-text-muted text-xs">Historial de peso y medidas corporales</p>
          </div>
        </div>

        {canEdit && (
          <Button
            type="button"
            size="sm"
            onClick={() => onAddingChange(true)}
            className="gap-1.5 px-3.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Registrar</span>
          </Button>
        )}
      </div>

      {measurements.length > 0 ? (
        <div className="space-y-2.5">
          {measurements.map((measurement, index) => {
            const previous = measurements[index + 1];
            const weightDelta =
              measurement.weight != null && previous?.weight != null
                ? Math.round((measurement.weight - previous.weight) * 10) / 10
                : null;

            const perimeters = [
              measurement.waist != null ? `Cintura ${measurement.waist}cm` : null,
              measurement.arm != null ? `Brazo ${measurement.arm}cm` : null,
              measurement.leg != null ? `Pierna ${measurement.leg}cm` : null,
            ].filter(Boolean);

            return (
              <div
                key={measurement.id}
                className="border-border/80 bg-surface hover:bg-surface-raised/50 flex flex-col gap-2 rounded-2xl border p-4 shadow-xs transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-text text-sm font-semibold">
                      {format(new Date(measurement.date), 'dd MMMM yyyy', { locale: es })}
                    </span>
                    {index === 0 && (
                      <span className="bg-brand/10 border-brand/20 text-brand rounded-md border px-2 py-0.5 text-xs font-semibold">
                        Actual
                      </span>
                    )}
                  </div>

                  {perimeters.length > 0 && (
                    <p className="text-text-muted mt-1 text-xs font-medium">
                      {perimeters.join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="text-text text-base font-bold tabular-nums">
                      {measurement.weight != null ? `${measurement.weight} kg` : '—'}
                      {weightDelta != null && weightDelta !== 0 && (
                        <span
                          className={`ml-1.5 text-xs font-semibold ${
                            weightDelta < 0 ? 'text-success' : 'text-brand'
                          }`}
                        >
                          {weightDelta > 0 ? `+${weightDelta}` : weightDelta}
                        </span>
                      )}
                    </p>
                    {measurement.body_fat_percentage != null && (
                      <p className="text-text-muted mt-0.5 text-xs font-medium">
                        {measurement.body_fat_percentage}% grasa
                      </p>
                    )}
                  </div>

                  {canEdit && onDelete && (
                    <button
                      type="button"
                      onClick={() => void onDelete(measurement.id)}
                      className="text-text-muted hover:bg-danger/10 hover:text-danger flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                      title="Eliminar medición"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-border/70 bg-surface flex flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center shadow-2xs">
          <Scale className="text-text-muted/50 mb-0.5 h-7 w-7" />
          <p className="text-text text-xs font-semibold sm:text-sm">Sin mediciones registradas</p>
          <p className="text-text-muted max-w-sm text-xs">
            Registra el peso y medidas del socio para llevar un control evolutivo y comparar cambios
            corporales.
          </p>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              className="mt-2 h-8 gap-1.5 px-3.5 text-xs"
              onClick={() => onAddingChange(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar ahora</span>
            </Button>
          )}
        </div>
      )}

      {/* Modal de Registro de Medición para Entrenador */}
      <Modal
        open={isAdding}
        onClose={() => onAddingChange(false)}
        title="Registrar medición corporal"
        maxWidth="lg"
        scrollable
      >
        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div>
            <Label className="text-text text-xs font-semibold">Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => onFormChange({ ...form, date: e.target.value })}
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-border/70 bg-surface rounded-xl border p-3">
              <Label className="text-text text-xs font-semibold">Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 78.5"
                value={form.weight}
                onChange={(e) => onFormChange({ ...form, weight: e.target.value })}
                className="mt-1 text-base font-bold tabular-nums"
              />
              {weightDelta != null && (
                <p
                  className={`mt-1.5 text-xs font-semibold ${
                    weightDelta < 0 ? 'text-success' : 'text-brand'
                  }`}
                >
                  {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg vs anterior
                </p>
              )}
            </div>

            <div className="border-border/70 bg-surface rounded-xl border p-3">
              <Label className="text-text text-xs font-semibold">Grasa corporal (%)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 18.0"
                value={form.body_fat_percentage}
                onChange={(e) => onFormChange({ ...form, body_fat_percentage: e.target.value })}
                className="mt-1 text-base font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="border-border/70 bg-surface space-y-2 rounded-xl border p-3">
            <Label className="text-text flex items-center gap-1.5 text-xs font-bold">
              <Ruler className="text-brand h-3.5 w-3.5" />
              <span>Perímetros (cm)</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-text-muted text-xs">Cintura</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 82"
                  value={form.waist}
                  onChange={(e) => onFormChange({ ...form, waist: e.target.value })}
                  className="mt-0.5 text-xs tabular-nums"
                />
              </div>
              <div>
                <span className="text-text-muted text-xs">Brazo</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 35"
                  value={form.arm}
                  onChange={(e) => onFormChange({ ...form, arm: e.target.value })}
                  className="mt-0.5 text-xs tabular-nums"
                />
              </div>
              <div>
                <span className="text-text-muted text-xs">Pierna</span>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="ej: 55"
                  value={form.leg}
                  onChange={(e) => onFormChange({ ...form, leg: e.target.value })}
                  className="mt-0.5 text-xs tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="border-border/70 flex items-center justify-end gap-2 border-t pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onAddingChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              Guardar medición
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
