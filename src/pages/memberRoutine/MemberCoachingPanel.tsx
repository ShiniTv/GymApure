import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Spinner } from '../../components/ui';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { clientLogger } from '../../lib/clientLogger';
import { useToastOptional } from '../../context/ToastContext';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | '';

interface Assessment {
  primary_goal: string | null;
  experience_level: Exclude<ExperienceLevel, ''> | null;
  preferences: string | null;
  equipment_access: string | null;
  mobility_notes: string | null;
  coaching_notes: string | null;
  updated_at: string;
}

interface Checkin {
  id: number;
  week_of: string;
  energy: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  adherence_score: number | null;
  notes: string | null;
}

const initialAssessment = {
  primary_goal: '',
  experience_level: '' as ExperienceLevel,
  preferences: '',
  equipment_access: '',
  mobility_notes: '',
  coaching_notes: '',
};

const initialCheckin = {
  energy: 3,
  sleep_quality: 3,
  stress_level: 3,
  soreness_level: 3,
  adherence_score: 3,
  notes: '',
};

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const inputId = `weekly-checkin-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <select
        id={inputId}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score}/5
          </option>
        ))}
      </select>
    </div>
  );
}

export function MemberCoachingPanel({ memberId }: { memberId: number }) {
  const toast = useToastOptional();
  const [assessment, setAssessment] = useState(initialAssessment);
  const [checkin, setCheckin] = useState(initialCheckin);
  const [history, setHistory] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [assessmentRes, checkinsRes] = await Promise.all([
        apiFetch(`/api/users/${memberId}/training-assessment`),
        apiFetch(`/api/users/${memberId}/weekly-checkins`),
      ]);
      const [assessmentData, checkinsData] = await Promise.all([
        parseJsonResponse<Assessment | null>(assessmentRes),
        parseJsonResponse<Checkin[]>(checkinsRes),
      ]);
      if (assessmentData) {
        setAssessment({
          primary_goal: assessmentData.primary_goal ?? '',
          experience_level: assessmentData.experience_level ?? '',
          preferences: assessmentData.preferences ?? '',
          equipment_access: assessmentData.equipment_access ?? '',
          mobility_notes: assessmentData.mobility_notes ?? '',
          coaching_notes: assessmentData.coaching_notes ?? '',
        });
      }
      setHistory(Array.isArray(checkinsData) ? checkinsData : []);
    } catch (error) {
      clientLogger.error('Failed to load coaching context', error);
      toast?.error('No se pudo cargar el contexto de entrenamiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [memberId]);

  const saveAssessment = async () => {
    setSavingAssessment(true);
    try {
      const result = await apiFetch(`/api/users/${memberId}/training-assessment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assessment,
          experience_level: assessment.experience_level || null,
        }),
      });
      await parseJsonResponse<Assessment>(result);
      toast?.success('Evaluación guardada');
    } catch (error) {
      clientLogger.error('Failed to save training assessment', error);
      toast?.error(error instanceof Error ? error.message : 'No se pudo guardar la evaluación');
    } finally {
      setSavingAssessment(false);
    }
  };

  const saveCheckin = async () => {
    setSavingCheckin(true);
    try {
      const result = await apiFetch(`/api/users/${memberId}/weekly-checkins`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkin),
      });
      const saved = await parseJsonResponse<Checkin>(result);
      setHistory((previous) => [
        saved,
        ...previous.filter((item) => item.week_of !== saved.week_of),
      ]);
      toast?.success('Check-in semanal guardado');
    } catch (error) {
      clientLogger.error('Failed to save weekly checkin', error);
      toast?.error(error instanceof Error ? error.message : 'No se pudo guardar el check-in');
    } finally {
      setSavingCheckin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="md" rounded="xl">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Evaluación de entrenamiento
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Contexto no clínico para adaptar el programa. La información de salud permanece en
            Perfil.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="assessment-primary-goal">Objetivo principal</Label>
            <Input
              id="assessment-primary-goal"
              value={assessment.primary_goal}
              onChange={(event) =>
                setAssessment({ ...assessment, primary_goal: event.target.value })
              }
              placeholder="Ej: ganar fuerza sin agravar rodilla"
            />
          </div>
          <div>
            <Label htmlFor="assessment-experience">Experiencia</Label>
            <select
              id="assessment-experience"
              value={assessment.experience_level}
              onChange={(event) =>
                setAssessment({
                  ...assessment,
                  experience_level: event.target.value as ExperienceLevel,
                })
              }
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
              <option value="">Sin definir</option>
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>
          <div>
            <Label htmlFor="assessment-preferences">Preferencias</Label>
            <Input
              id="assessment-preferences"
              value={assessment.preferences}
              onChange={(event) =>
                setAssessment({ ...assessment, preferences: event.target.value })
              }
              placeholder="Horarios, ejercicios que disfruta o evita"
            />
          </div>
          <div>
            <Label htmlFor="assessment-equipment">Equipo disponible</Label>
            <Input
              id="assessment-equipment"
              value={assessment.equipment_access}
              onChange={(event) =>
                setAssessment({ ...assessment, equipment_access: event.target.value })
              }
              placeholder="Gym completo, casa, mancuernas…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="assessment-mobility">Movilidad y observaciones</Label>
            <textarea
              id="assessment-mobility"
              value={assessment.mobility_notes}
              onChange={(event) =>
                setAssessment({ ...assessment, mobility_notes: event.target.value })
              }
              className="min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="assessment-notes">Notas de programación</Label>
            <textarea
              id="assessment-notes"
              value={assessment.coaching_notes}
              onChange={(event) =>
                setAssessment({ ...assessment, coaching_notes: event.target.value })
              }
              className="min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
          </div>
        </div>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => void saveAssessment()}
          disabled={savingAssessment}
        >
          {savingAssessment ? 'Guardando…' : 'Guardar evaluación'}
        </Button>
      </Card>

      <Card padding="md" rounded="xl">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Check-in de la semana
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Registra cómo llega el cliente para decidir si mantienes, progresas o reduces la carga.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <ScoreField
            label="Energía"
            value={checkin.energy}
            onChange={(energy) => setCheckin({ ...checkin, energy })}
          />
          <ScoreField
            label="Sueño"
            value={checkin.sleep_quality}
            onChange={(sleep_quality) => setCheckin({ ...checkin, sleep_quality })}
          />
          <ScoreField
            label="Estrés"
            value={checkin.stress_level}
            onChange={(stress_level) => setCheckin({ ...checkin, stress_level })}
          />
          <ScoreField
            label="Molestias"
            value={checkin.soreness_level}
            onChange={(soreness_level) => setCheckin({ ...checkin, soreness_level })}
          />
          <ScoreField
            label="Adherencia"
            value={checkin.adherence_score}
            onChange={(adherence_score) => setCheckin({ ...checkin, adherence_score })}
          />
        </div>
        <div className="mt-3">
          <Label htmlFor="weekly-checkin-notes">Notas</Label>
          <textarea
            id="weekly-checkin-notes"
            value={checkin.notes}
            onChange={(event) => setCheckin({ ...checkin, notes: event.target.value })}
            className="min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            placeholder="Ej: durmió poco, ajustar volumen de pierna"
          />
        </div>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => void saveCheckin()}
          disabled={savingCheckin}
        >
          {savingCheckin ? 'Guardando…' : 'Guardar check-in'}
        </Button>

        {history.length > 0 && (
          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Últimos check-ins
            </h3>
            <div className="mt-2 space-y-2">
              {history.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-zinc-50 px-3 py-2 text-xs dark:bg-zinc-800/60"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-zinc-600 dark:text-zinc-300">
                    <span className="font-medium">{item.week_of}</span>
                    <span>
                      Energía {item.energy ?? '—'} · Sueño {item.sleep_quality ?? '—'} · Adherencia{' '}
                      {item.adherence_score ?? '—'}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
