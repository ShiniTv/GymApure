import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Scale, Activity, Ruler, TrendingDown, TrendingUp } from 'lucide-react';
import { Modal, Button, Input, Label } from '../../components/ui';
import type { Measurement } from '../../hooks/queries/useProfileQuery';

export interface MeasurementFormPayload {
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  waist: number | null;
  arm: number | null;
  leg: number | null;
}

interface MeasurementModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MeasurementFormPayload) => Promise<void>;
  latestMeasurement: Measurement | null;
  initialWeight?: number | null;
  heightCm?: number | null;
  editingMeasurement?: Measurement | null;
}

export function MeasurementModal({
  open,
  onClose,
  onSubmit,
  latestMeasurement,
  initialWeight,
  heightCm,
  editingMeasurement,
}: MeasurementModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [leg, setLeg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeZone, setActiveZone] = useState<'general' | 'perimeters'>('general');

  useEffect(() => {
    if (!open) return;
    if (editingMeasurement) {
      setDate(
        editingMeasurement.date
          ? editingMeasurement.date.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setWeight(editingMeasurement.weight != null ? String(editingMeasurement.weight) : '');
      setBodyFat(
        editingMeasurement.body_fat_percentage != null
          ? String(editingMeasurement.body_fat_percentage)
          : ''
      );
      setWaist(editingMeasurement.waist != null ? String(editingMeasurement.waist) : '');
      setArm(editingMeasurement.arm != null ? String(editingMeasurement.arm) : '');
      setLeg(editingMeasurement.leg != null ? String(editingMeasurement.leg) : '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setWeight('');
      setBodyFat('');
      setWaist('');
      setArm('');
      setLeg('');
    }
  }, [open, editingMeasurement]);

  // Cálculos dinámicos en tiempo real (Deltas e IMC)
  const numWeight = parseFloat(weight);
  const numBodyFat = parseFloat(bodyFat);
  const numWaist = parseFloat(waist);
  const numArm = parseFloat(arm);
  const numLeg = parseFloat(leg);

  const prevWeight = latestMeasurement?.weight ?? initialWeight ?? null;
  const weightDelta =
    !isNaN(numWeight) && prevWeight != null ? Math.round((numWeight - prevWeight) * 10) / 10 : null;

  const prevFat = latestMeasurement?.body_fat_percentage ?? null;
  const fatDelta =
    !isNaN(numBodyFat) && prevFat != null ? Math.round((numBodyFat - prevFat) * 10) / 10 : null;

  const currentBmi = useMemo(() => {
    if (isNaN(numWeight) || !heightCm || heightCm <= 0) return null;
    const h = heightCm / 100;
    return Math.round((numWeight / (h * h)) * 10) / 10;
  }, [numWeight, heightCm]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        date: date || new Date().toISOString().split('T')[0],
        weight: !isNaN(numWeight) ? numWeight : null,
        body_fat_percentage: !isNaN(numBodyFat) ? numBodyFat : null,
        waist: !isNaN(numWaist) ? numWaist : null,
        arm: !isNaN(numArm) ? numArm : null,
        leg: !isNaN(numLeg) ? numLeg : null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingMeasurement ? 'Editar medición corporal' : 'Nueva medición corporal'}
      maxWidth="xl"
      scrollable
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Selector de Fecha */}
        <div className="border-border/70 bg-surface-raised/50 rounded-xl border p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
              Fecha de la medición
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="max-w-xs font-medium"
            />
          </div>
        </div>

        {/* Selector de Secciones Anatómicas */}
        <div className="bg-surface-raised border-border/60 flex rounded-xl border p-1">
          <button
            type="button"
            onClick={() => setActiveZone('general')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeZone === 'general'
                ? 'bg-surface text-brand shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Composición General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveZone('perimeters')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeZone === 'perimeters'
                ? 'bg-surface text-brand shadow-xs'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>Perímetros y Zonas</span>
          </button>
        </div>

        {/* Zona 1: Composición General */}
        {activeZone === 'general' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="border-border/70 bg-surface rounded-xl border p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-text font-semibold">Peso corporal</Label>
                  <span className="text-text-muted text-[11px] font-medium">kg</span>
                </div>
                <div className="mt-1.5">
                  <Input
                    type="number"
                    step="0.1"
                    min="20"
                    max="400"
                    placeholder="ej: 75.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="text-lg font-bold tabular-nums"
                  />
                </div>

                {weightDelta != null && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                    {weightDelta < 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <TrendingDown className="h-3.5 w-3.5" /> {weightDelta} kg vs previa
                      </span>
                    ) : weightDelta > 0 ? (
                      <span className="text-brand inline-flex items-center gap-0.5">
                        <TrendingUp className="h-3.5 w-3.5" /> +{weightDelta} kg vs previa
                      </span>
                    ) : (
                      <span className="text-text-muted">Sin variación vs previa</span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-border/70 bg-surface rounded-xl border p-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <Label className="text-text font-semibold">Grasa corporal</Label>
                  <span className="text-text-muted text-[11px] font-medium">% opcional</span>
                </div>
                <div className="mt-1.5">
                  <Input
                    type="number"
                    step="0.1"
                    min="3"
                    max="70"
                    placeholder="ej: 16.5"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className="text-lg font-bold tabular-nums"
                  />
                </div>

                {fatDelta != null && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
                    {fatDelta < 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <TrendingDown className="h-3.5 w-3.5" /> {fatDelta}% vs previa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        <TrendingUp className="h-3.5 w-3.5" /> +{fatDelta}% vs previa
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cálculo de IMC en tiempo real */}
            {currentBmi != null && (
              <div className="bg-surface-raised/80 border-border/50 flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="text-brand h-4 w-4" />
                  <span className="text-text-secondary font-medium">IMC Calculado:</span>
                  <span className="text-text font-bold tabular-nums">{currentBmi}</span>
                </div>
                <span className="bg-brand/10 text-brand rounded-md px-2 py-0.5 font-semibold">
                  {currentBmi < 18.5
                    ? 'Bajo peso'
                    : currentBmi < 25
                      ? 'Normal'
                      : currentBmi < 30
                        ? 'Sobrepeso'
                        : 'Obesidad'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Zona 2: Perímetros Corporales */}
        {activeZone === 'perimeters' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="border-border/70 bg-surface rounded-xl border p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <Label className="text-text text-xs font-semibold">Cintura</Label>
                <span className="text-text-muted text-[10px]">cm</span>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 82.0"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="mt-1 font-semibold tabular-nums"
              />
              {latestMeasurement?.waist != null && !isNaN(numWaist) && (
                <p className="text-text-muted mt-1 text-[11px] font-medium">
                  Prev: {latestMeasurement.waist} cm
                </p>
              )}
            </div>

            <div className="border-border/70 bg-surface rounded-xl border p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <Label className="text-text text-xs font-semibold">Brazo</Label>
                <span className="text-text-muted text-[10px]">cm</span>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 36.5"
                value={arm}
                onChange={(e) => setArm(e.target.value)}
                className="mt-1 font-semibold tabular-nums"
              />
              {latestMeasurement?.arm != null && !isNaN(numArm) && (
                <p className="text-text-muted mt-1 text-[11px] font-medium">
                  Prev: {latestMeasurement.arm} cm
                </p>
              )}
            </div>

            <div className="border-border/70 bg-surface rounded-xl border p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <Label className="text-text text-xs font-semibold">Pierna / Muslo</Label>
                <span className="text-text-muted text-[10px]">cm</span>
              </div>
              <Input
                type="number"
                step="0.1"
                placeholder="ej: 58.0"
                value={leg}
                onChange={(e) => setLeg(e.target.value)}
                className="mt-1 font-semibold tabular-nums"
              />
              {latestMeasurement?.leg != null && !isNaN(numLeg) && (
                <p className="text-text-muted mt-1 text-[11px] font-medium">
                  Prev: {latestMeasurement.leg} cm
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer de Acciones */}
        <div className="border-border/70 flex items-center justify-end gap-2 border-t pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || (!weight && !bodyFat && !waist && !arm && !leg)}
          >
            {submitting
              ? 'Guardando…'
              : editingMeasurement
                ? 'Actualizar medición'
                : 'Guardar medición'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
