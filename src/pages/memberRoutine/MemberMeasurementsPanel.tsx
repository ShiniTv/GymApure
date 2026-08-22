import type { FormEvent } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
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
}

export function MemberMeasurementsPanel({
  measurements,
  canEdit,
  isAdding,
  form,
  onAddingChange,
  onFormChange,
  onSubmit,
}: MemberMeasurementsPanelProps) {
  return (
    <>
      <div className="space-y-2">
        {canEdit && measurements.length > 0 && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2.5 text-xs"
              onClick={() => onAddingChange(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar
            </Button>
          </div>
        )}
        {measurements.length > 0 ? (
          <div className="border-border rounded-xl border">
            {measurements.map((measurement, index) => {
              const previous = measurements[index + 1];
              const weightDelta =
                measurement.weight != null && previous?.weight != null
                  ? Math.round((measurement.weight - previous.weight) * 10) / 10
                  : null;
              const extras = [
                measurement.waist != null ? `cintura ${measurement.waist}` : null,
                measurement.arm != null ? `brazo ${measurement.arm}` : null,
                measurement.leg != null ? `pierna ${measurement.leg}` : null,
              ].filter(Boolean);
              return (
                <div
                  key={measurement.id}
                  className={`flex items-start justify-between gap-2 px-3 py-2.5 text-xs sm:text-sm ${
                    index < measurements.length - 1 ? 'border-border-subtle border-b' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-text-secondary font-medium">
                      {format(new Date(measurement.date), 'dd MMM yyyy', { locale: es })}
                    </p>
                    {extras.length > 0 && (
                      <p className="text-text-muted mt-0.5 text-[10px]">{extras.join(' · ')} cm</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    {measurement.weight != null ? (
                      <p className="text-text font-semibold">
                        {measurement.weight} kg
                        {weightDelta != null && weightDelta !== 0 && (
                          <span
                            className={
                              weightDelta < 0
                                ? 'ml-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'
                                : 'ml-1 text-[10px] font-medium text-amber-600 dark:text-amber-400'
                            }
                          >
                            {weightDelta > 0 ? '+' : ''}
                            {weightDelta}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-text-muted">—</p>
                    )}
                    {measurement.body_fat_percentage != null && (
                      <p className="text-text-muted text-[10px]">
                        {measurement.body_fat_percentage}% grasa
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-border rounded-xl border border-dashed px-3 py-6 text-center">
            <p className="text-text text-sm font-semibold">Sin mediciones</p>
            <p className="text-text-muted mt-1 text-xs">
              Registra la primera para ver el progreso en Perfil.
            </p>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                className="mt-3 h-9 px-3 text-xs"
                onClick={() => onAddingChange(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar
              </Button>
            )}
          </div>
        )}
      </div>

      <Modal
        open={isAdding}
        onClose={() => onAddingChange(false)}
        title="Nueva medición"
        maxWidth="xl"
        scrollable
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => onFormChange({ ...form, date: event.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['weight', 'Peso (kg)'],
              ['body_fat_percentage', 'Grasa (%)'],
              ['waist', 'Cintura (cm)'],
              ['arm', 'Brazo (cm)'],
              ['leg', 'Pierna (cm)'],
            ].map(([field, label]) => (
              <div key={field} className="max-w-[8rem]">
                <Label>{label}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form[field as keyof MeasurementFormValue]}
                  onChange={(event) => onFormChange({ ...form, [field]: event.target.value })}
                />
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>
    </>
  );
}
