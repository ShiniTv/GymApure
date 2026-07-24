import { useState, FormEvent, useRef } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Pencil,
  MessageSquare,
  Beef,
  Wheat,
  Droplet,
  Camera,
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  PageHeader,
  Label,
  Input,
  Select,
  Spinner,
  EmptyState,
  PageState,
  BackToDashboardLink,
} from '../components/ui';
import { MacroRing } from '../components/nutrition/MacroRing';
import { CalorieSemiGauge } from '../components/nutrition/CalorieSemiGauge';
import { WeekDateStrip } from '../components/nutrition/WeekDateStrip';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  formatLocalDate,
  macroHint,
  sumLogEntries,
  type MealType,
  type NutritionLogEntry,
} from '../lib/nutrition';
import {
  useNutritionPlanQuery,
  useNutritionLogsQuery,
  useInvalidateNutrition,
} from '../hooks/queries/useNutritionQuery';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';

const emptyMealForm = {
  meal_type: 'lunch' as MealType,
  description: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
};

interface FoodAnalysisPreview {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence?: number;
  warnings?: string[];
}

export default function Nutrition() {
  const { user } = useAuth();
  const invalidate = useInvalidateNutrition();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingLog, setEditingLog] = useState<NutritionLogEntry | null>(null);
  const [mealForm, setMealForm] = useState(emptyMealForm);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisHints, setAnalysisHints] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: plan, isPending: planLoading } = useNutritionPlanQuery(user?.id);
  const { data: logs = [], isPending: logsLoading } = useNutritionLogsQuery(user?.id, selectedDate);

  const totals = sumLogEntries(logs);
  const canEditLogs = selectedDate <= formatLocalDate(new Date());
  const loading = planLoading || logsLoading;

  usePageTitle('Nutrición');

  const openAddMeal = () => {
    setEditingLog(null);
    setMealForm(emptyMealForm);
    setAnalysisHints([]);
    setError('');
    setShowMealModal(true);
  };

  const openEditMeal = (log: NutritionLogEntry) => {
    setEditingLog(log);
    setMealForm({
      meal_type: log.meal_type,
      description: log.description,
      calories: String(log.calories),
      protein_g: String(log.protein_g),
      carbs_g: String(log.carbs_g),
      fat_g: String(log.fat_g),
    });
    setAnalysisHints([]);
    setError('');
    setShowMealModal(true);
  };

  const applyAnalysis = (analysis: FoodAnalysisPreview) => {
    setMealForm((prev) => ({
      ...prev,
      description: analysis.description || prev.description,
      calories: String(Math.round(analysis.calories) || 0),
      protein_g: String(analysis.protein_g ?? 0),
      carbs_g: String(analysis.carbs_g ?? 0),
      fat_g: String(analysis.fat_g ?? 0),
    }));
    const hints: string[] = [];
    if (typeof analysis.confidence === 'number') {
      hints.push(`Confianza estimada: ${Math.round(analysis.confidence * 100)}%`);
    }
    if (analysis.warnings?.length) hints.push(...analysis.warnings);
    hints.push('Revisa y ajusta los macros antes de guardar.');
    setAnalysisHints(hints);
  };

  const handleAnalyzePhoto = async (file: File | undefined) => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await apiFetch('/api/nutrition/analyze-food', { method: 'POST', body });
      const analysis = await parseJsonResponse<FoodAnalysisPreview>(res);
      applyAnalysis(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo analizar la foto');
    } finally {
      setAnalyzing(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSaveMeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        meal_type: mealForm.meal_type,
        description: mealForm.description.trim(),
        calories: parseInt(mealForm.calories, 10) || 0,
        protein_g: parseFloat(mealForm.protein_g) || 0,
        carbs_g: parseFloat(mealForm.carbs_g) || 0,
        fat_g: parseFloat(mealForm.fat_g) || 0,
      };
      if (selectedDate !== formatLocalDate(new Date())) {
        body.logged_at = `${selectedDate}T12:00:00.000Z`;
      }
      if (editingLog) {
        const res = await apiFetch(`/api/nutrition/logs/${editingLog.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        await parseJsonResponse(res);
      } else {
        const res = await apiFetch(`/api/users/${user.id}/nutrition/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        await parseJsonResponse(res);
      }
      invalidate(user.id);
      setShowMealModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeal = async (log: NutritionLogEntry) => {
    if (!user || !confirm('¿Eliminar esta comida?')) return;
    try {
      await apiFetch(`/api/nutrition/logs/${log.id}`, { method: 'DELETE' });
      invalidate(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (loading && !plan) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando nutrición…</p>
      </PageState>
    );
  }

  if (!plan) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-4xl">
        <PageHeader
          compact
          title={
            <>
              Mi <span className="text-brand">nutrición</span>
            </>
          }
          subtitle="Seguimiento diario de comidas"
          action={<BackToDashboardLink />}
        />
        <EmptyState
          icon={UtensilsCrossed}
          title="Sin plan nutricional"
          description="Tu entrenador aún no ha definido tu plan. Cuando lo haga, podrás registrar comidas y ver tu progreso."
          action={
            <Link to="/messages">
              <Button variant="secondary">
                <MessageSquare className="h-4 w-4" />
                Contactar al gym
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const hints = [
    macroHint(plan, totals, 'calories'),
    macroHint(plan, totals, 'protein'),
    macroHint(plan, totals, 'carbs'),
    macroHint(plan, totals, 'fat'),
  ].filter(Boolean);
  /** One line only after logging — empty day already reads clear from gauge/rings. */
  const coachingHint = logs.length > 0 ? (hints[0] ?? null) : null;

  const logsByMeal = MEAL_TYPE_ORDER.map((type) => ({
    type,
    items: logs.filter((l) => l.meal_type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="page-stack-tight mx-auto w-full max-w-4xl">
      <PageHeader
        compact
        title={
          <>
            Mi <span className="text-brand">nutrición</span>
          </>
        }
        subtitle={plan.title}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <BackToDashboardLink />
            <Button size="sm" onClick={openAddMeal} disabled={!canEditLogs}>
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </div>
        }
      />

      <WeekDateStrip selectedDate={selectedDate} onSelect={setSelectedDate} className="px-1" />

      <div className="md:grid md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:items-stretch md:gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="space-y-2">
          <section className="pt-3 sm:pt-2 md:pt-0">
            <CalorieSemiGauge
              consumed={totals.calories}
              target={plan.calories_target}
              date={selectedDate}
            />
          </section>

          <section className="mx-auto grid max-w-sm grid-cols-3 justify-items-center gap-1 px-1 pt-2 pb-1 md:max-w-none md:pt-1">
            <MacroRing
              label="Proteína"
              consumed={totals.protein}
              target={plan.protein_target_g}
              colorClass="text-amber-400 dark:text-amber-300"
              glowColor="#fbbf24"
              icon={Beef}
            />
            <MacroRing
              label="Carbos"
              consumed={totals.carbs}
              target={plan.carbs_target_g}
              colorClass="text-orange-500"
              glowColor="#f97316"
              icon={Wheat}
            />
            <MacroRing
              label="Grasas"
              consumed={totals.fat}
              target={plan.fat_target_g}
              colorClass="text-rose-500"
              glowColor="#f43f5e"
              icon={Droplet}
            />
          </section>

          {coachingHint && (
            <p className="px-1 pb-1 text-center text-[11px] text-zinc-500 md:text-left dark:text-zinc-400">
              {coachingHint}
            </p>
          )}

          {plan.notes && (
            <p className="px-2 pb-1 text-center text-[11px] leading-relaxed text-zinc-500 md:px-1 md:text-left dark:text-zinc-400">
              <span className="text-zinc-400 dark:text-zinc-500">Entrenador · </span>
              {plan.notes}
            </p>
          )}
        </div>

        <Card padding="sm" rounded="xl" className="border-zinc-200/80 md:p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="section-title">Comidas del día</h2>
            {canEditLogs && (
              <Button size="sm" variant="ghost" onClick={openAddMeal} className="text-brand">
                <Plus className="h-4 w-4" />
                Añadir
              </Button>
            )}
          </div>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 py-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <UtensilsCrossed className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Aún no registraste comidas hoy.
              </p>
              {canEditLogs && (
                <Button size="sm" onClick={openAddMeal}>
                  <Plus className="h-4 w-4" />
                  Registrar comida
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {logsByMeal.map(({ type, items }) => (
                <div key={type}>
                  <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">
                    {MEAL_TYPE_LABELS[type]}
                  </p>
                  <ul className="space-y-2">
                    {items.map((log) => (
                      <li
                        key={log.id}
                        className="flex items-start justify-between gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {log.description}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                            {log.calories} kcal · P {log.protein_g}g · C {log.carbs_g}g · G{' '}
                            {log.fat_g}g
                          </p>
                        </div>
                        {canEditLogs && (
                          <div className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEditMeal(log)}
                              className="hover:text-brand hover:bg-brand/10 rounded-xl p-2 text-zinc-400 dark:text-zinc-300"
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMeal(log)}
                              className="rounded-xl p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={showMealModal}
        onClose={() => !saving && !analyzing && setShowMealModal(false)}
        title={editingLog ? 'Editar comida' : 'Registrar comida'}
        maxWidth="md"
      >
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
        {!editingLog && (
          <div className="mb-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => void handleAnalyzePhoto(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full gap-2"
              loading={analyzing}
              disabled={saving}
              onClick={() => photoInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Analizar foto
            </Button>
            {analysisHints.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {analysisHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <form onSubmit={handleSaveMeal} className="form-stack">
          <div>
            <Label>Tipo</Label>
            <Select
              value={mealForm.meal_type}
              onChange={(e) => setMealForm({ ...mealForm, meal_type: e.target.value as MealType })}
            >
              {MEAL_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {MEAL_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Descripción</Label>
            <Input
              value={mealForm.description}
              onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
              placeholder="Ej. Pollo con arroz y ensalada"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Calorías (kcal)</Label>
              <Input
                type="number"
                min={0}
                value={mealForm.calories}
                onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Proteína (g)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={mealForm.protein_g}
                onChange={(e) => setMealForm({ ...mealForm, protein_g: e.target.value })}
              />
            </div>
            <div>
              <Label>Carbos (g)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={mealForm.carbs_g}
                onChange={(e) => setMealForm({ ...mealForm, carbs_g: e.target.value })}
              />
            </div>
            <div>
              <Label>Grasas (g)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={mealForm.fat_g}
                onChange={(e) => setMealForm({ ...mealForm, fat_g: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowMealModal(false)}
              disabled={saving || analyzing}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={analyzing || !mealForm.description.trim()}
            >
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
