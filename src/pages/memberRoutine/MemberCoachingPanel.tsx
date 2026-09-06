import { useEffect, useState } from 'react';
import { Button, Card, Input, Label, Modal, Spinner } from '../../components/ui';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { clientLogger } from '../../lib/clientLogger';
import { useToastOptional } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

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

interface CoachingSuggestion {
  id: number;
  status: 'pending' | 'approved' | 'dismissed';
  suggestion_type: 'load_increase' | 'load_decrease' | 'maintain' | 'deload';
  routine_name: string;
  exercise_name: string;
  proposed_snapshot: {
    sets: number;
    reps: number;
    rest_seconds: number | null;
    weight_suggestion: string | null;
  };
  rationale: { message?: string };
  trainer_note: string | null;
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
        className="border-border bg-surface text-text h-10 w-full rounded-lg border px-2 text-sm"
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
  const { user } = useAuth();
  const toast = useToastOptional();
  const [assessment, setAssessment] = useState(initialAssessment);
  const [checkin, setCheckin] = useState(initialCheckin);
  const [history, setHistory] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [suggestions, setSuggestions] = useState<CoachingSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [reviewingSuggestionId, setReviewingSuggestionId] = useState<number | null>(null);
  const [sharedRoutineTarget, setSharedRoutineTarget] = useState<CoachingSuggestion | null>(null);
  const isTrainer = user?.role === 'trainer';

  const loadSuggestions = async () => {
    if (!isTrainer) return;
    setLoadingSuggestions(true);
    try {
      const response = await apiFetch(`/api/users/${memberId}/coaching-suggestions`);
      const data = await parseJsonResponse<CoachingSuggestion[]>(response);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      clientLogger.error('Failed to load coaching suggestions', error);
      toast?.error('No se pudieron cargar las sugerencias');
    } finally {
      setLoadingSuggestions(false);
    }
  };

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

  useEffect(() => {
    void loadSuggestions();
  }, [memberId, isTrainer]);

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
      toast?.success('Seguimiento semanal guardado');
    } catch (error) {
      clientLogger.error('Failed to save weekly checkin', error);
      toast?.error(error instanceof Error ? error.message : 'No se pudo guardar el seguimiento');
    } finally {
      setSavingCheckin(false);
    }
  };

  const generateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      const response = await apiFetch(`/api/users/${memberId}/coaching-suggestions/generate`, {
        method: 'POST',
      });
      await parseJsonResponse(response);
      await loadSuggestions();
      toast?.success('Sugerencias actualizadas');
    } catch (error) {
      clientLogger.error('Failed to generate coaching suggestions', error);
      toast?.error(error instanceof Error ? error.message : 'No se pudieron generar sugerencias');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const reviewSuggestion = async (
    suggestion: CoachingSuggestion,
    action: 'approve' | 'dismiss',
    acknowledgeSharedRoutine = false
  ) => {
    setReviewingSuggestionId(suggestion.id);
    try {
      const response = await apiFetch(
        `/api/users/${memberId}/coaching-suggestions/${suggestion.id}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acknowledge_shared_routine: acknowledgeSharedRoutine }),
        }
      );
      const errorBody =
        response.status === 409
          ? ((await response
              .clone()
              .json()
              .catch(() => ({}))) as { error?: string })
          : null;
      if (
        response.status === 409 &&
        action === 'approve' &&
        !acknowledgeSharedRoutine &&
        /rutina está compartida/i.test(errorBody?.error ?? '')
      ) {
        setSharedRoutineTarget(suggestion);
        return;
      }
      await parseJsonResponse(response);
      await loadSuggestions();
      toast?.success(action === 'approve' ? 'Sugerencia aplicada' : 'Sugerencia descartada');
    } catch (error) {
      clientLogger.error('Failed to review coaching suggestion', error);
      toast?.error(error instanceof Error ? error.message : 'No se pudo revisar la sugerencia');
    } finally {
      setReviewingSuggestionId(null);
    }
  };

  const applySharedRoutineSuggestion = () => {
    if (!sharedRoutineTarget || reviewingSuggestionId) return;
    void reviewSuggestion(sharedRoutineTarget, 'approve', true).then(() => {
      setSharedRoutineTarget(null);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="md" rounded="xl">
        <div className="mb-4">
          <h2 className="text-text text-sm font-semibold">Evaluación de entrenamiento</h2>
          <p className="text-text-muted mt-1 text-xs">
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
              className="border-border bg-surface text-text h-10 w-full rounded-lg border px-2 text-sm"
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
              className="border-border bg-surface text-text min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
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
              className="border-border bg-surface text-text min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
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
          <h2 className="text-text text-sm font-semibold">Seguimiento de la semana</h2>
          <p className="text-text-muted mt-1 text-xs">
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
            className="border-border bg-surface text-text min-h-20 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Ej: durmió poco, ajustar volumen de pierna"
          />
        </div>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => void saveCheckin()}
          disabled={savingCheckin}
        >
          {savingCheckin ? 'Guardando…' : 'Guardar seguimiento'}
        </Button>

        {history.length > 0 && (
          <div className="border-border-subtle mt-5 border-t pt-4">
            <h3 className="text-text-secondary text-xs font-semibold">Últimos registros</h3>
            <div className="mt-2 space-y-2">
              {history.slice(0, 4).map((item) => (
                <div key={item.id} className="bg-surface-raised rounded-lg px-3 py-2 text-xs">
                  <div className="text-text-secondary flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{item.week_of}</span>
                    <span>
                      Energía {item.energy ?? '—'} · Sueño {item.sleep_quality ?? '—'} · Adherencia{' '}
                      {item.adherence_score ?? '—'}
                    </span>
                  </div>
                  {item.notes && <p className="text-text-muted mt-1">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {isTrainer && (
        <Card padding="md" rounded="xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-text text-sm font-semibold">Sugerencias de programación</h2>
              <p className="text-text-muted mt-1 text-xs">
                Basadas en el último registro y feedback reciente. Requieren tu aprobación.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => void generateSuggestions()}
              disabled={generatingSuggestions}
            >
              {generatingSuggestions ? 'Generando…' : 'Generar sugerencias'}
            </Button>
          </div>

          {loadingSuggestions ? (
            <div className="flex justify-center py-5">
              <Spinner />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-text-muted mt-4 text-sm">Aún no hay sugerencias generadas.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border-border rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-text font-medium">
                      {suggestion.exercise_name} · {suggestion.routine_name}
                    </p>
                    <span className="text-text-muted text-xs capitalize">
                      {suggestion.status === 'pending' ? 'Pendiente' : suggestion.status}
                    </span>
                  </div>
                  <p className="text-text-secondary mt-1 text-xs">
                    {suggestion.rationale.message ?? 'Revisar la sugerencia antes de aplicarla.'}
                  </p>
                  <p className="text-text-muted mt-2 text-xs">
                    Propuesta: {suggestion.proposed_snapshot.sets} series ×{' '}
                    {suggestion.proposed_snapshot.reps} reps
                    {suggestion.proposed_snapshot.weight_suggestion
                      ? ` · ${suggestion.proposed_snapshot.weight_suggestion}`
                      : ''}
                  </p>
                  {suggestion.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void reviewSuggestion(suggestion, 'approve')}
                        disabled={reviewingSuggestionId === suggestion.id}
                      >
                        Aprobar y aplicar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void reviewSuggestion(suggestion, 'dismiss')}
                        disabled={reviewingSuggestionId === suggestion.id}
                      >
                        Descartar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={!!sharedRoutineTarget}
        onClose={() => !reviewingSuggestionId && setSharedRoutineTarget(null)}
        title="Rutina compartida"
        maxWidth="sm"
        initialFocus="dialog"
      >
        <p className="text-text-secondary mb-2 text-sm">
          Esta rutina también está asignada a otros miembros. ¿Aplicar el ajuste para todos?
        </p>
        {sharedRoutineTarget ? (
          <p className="text-text-muted mb-6 text-xs">
            {sharedRoutineTarget.exercise_name} · {sharedRoutineTarget.routine_name}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setSharedRoutineTarget(null)}
            disabled={!!reviewingSuggestionId}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={applySharedRoutineSuggestion}
            disabled={!!reviewingSuggestionId}
          >
            {reviewingSuggestionId ? 'Aplicando…' : 'Aplicar para todos'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
