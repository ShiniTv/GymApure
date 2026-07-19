import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, Plus, Trash2, Pencil, MessageSquare, Target } from 'lucide-react';
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
import { MacroProgressBar, AdherenceBar } from '../components/nutrition/MacroProgressBar';
import { MacroRing } from '../components/nutrition/MacroRing';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
  adherencePercent,
  formatLocalDate,
  macroHint,
  sumLogEntries,
  type MealType,
  type NutritionLogEntry,
} from '../lib/nutrition';
import {
  useNutritionPlanQuery,
  useNutritionLogsQuery,
  useNutritionSummaryQuery,
  useInvalidateNutrition,
} from '../hooks/queries/useNutritionQuery';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { cn } from '../lib/utils';
import { usePageTitle } from '../hooks/usePageTitle';

const emptyMealForm = {
  meal_type: 'lunch' as MealType,
  description: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
};

export default function Nutrition() {
  const { user } = useAuth();
  const invalidate = useInvalidateNutrition();
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingLog, setEditingLog] = useState<NutritionLogEntry | null>(null);
  const [mealForm, setMealForm] = useState(emptyMealForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: plan, isPending: planLoading } = useNutritionPlanQuery(user?.id);
  const { data: logs = [], isPending: logsLoading } = useNutritionLogsQuery(user?.id, selectedDate);
  const { data: summary } = useNutritionSummaryQuery(user?.id, 7);

  const totals = sumLogEntries(logs);
  const canEditLogs = selectedDate <= formatLocalDate(new Date());
  const loading = planLoading || logsLoading;

  usePageTitle('Nutrición');

  const openAddMeal = () => {
    setEditingLog(null);
    setMealForm(emptyMealForm);
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
    setError('');
    setShowMealModal(true);
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
      <div className="page-stack-tight">
        <PageHeader
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

  const adherence = adherencePercent(plan, totals);
  const hints = [
    macroHint(plan, totals, 'calories'),
    macroHint(plan, totals, 'protein'),
    macroHint(plan, totals, 'carbs'),
    macroHint(plan, totals, 'fat'),
  ].filter(Boolean);

  const logsByMeal = MEAL_TYPE_ORDER.map((type) => ({
    type,
    items: logs.filter((l) => l.meal_type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="page-stack-tight max-w-3xl">
      <PageHeader
        title={
          <>
            Mi <span className="text-brand">nutrición</span>
          </>
        }
        subtitle={plan.title}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <BackToDashboardLink />
            <Button
              size="sm"
              onClick={openAddMeal}
              disabled={selectedDate > formatLocalDate(new Date())}
            >
              <Plus className="h-4 w-4" />
              Registrar comida
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="date"
          value={selectedDate}
          max={formatLocalDate(new Date())}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="sm:max-w-[11rem]"
        />
        {selectedDate !== formatLocalDate(new Date()) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(formatLocalDate(new Date()))}
          >
            Hoy
          </Button>
        )}
      </div>

      <Card padding="sm" rounded="xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="section-title flex items-center gap-1.5">
            <Target className="text-brand h-3.5 w-3.5" />
            Resumen del día
          </h2>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
              adherence >= 75
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : adherence >= 50
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
            )}
          >
            {adherence}% adherencia
          </span>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 border-b border-zinc-100 pb-4 sm:grid-cols-4 dark:border-zinc-800">
          <MacroRing
            label="Calorías"
            consumed={totals.calories}
            target={plan.calories_target}
            colorClass="text-orange-500"
            unit=" kcal"
          />
          <MacroRing
            label="Proteína"
            consumed={totals.protein}
            target={plan.protein_target_g}
            colorClass="text-emerald-500"
            unit="g"
          />
          <MacroRing
            label="Carbos"
            consumed={totals.carbs}
            target={plan.carbs_target_g}
            colorClass="text-blue-500"
            unit="g"
          />
          <MacroRing
            label="Grasas"
            consumed={totals.fat}
            target={plan.fat_target_g}
            colorClass="text-amber-500"
            unit="g"
          />
        </div>
        <div className="space-y-3">
          <MacroProgressBar
            label="Calorías"
            consumed={totals.calories}
            target={plan.calories_target}
            margin={plan.calories_margin}
            unit="kcal"
          />
          <MacroProgressBar
            label="Proteína"
            consumed={totals.protein}
            target={plan.protein_target_g}
            margin={plan.protein_margin_g}
            unit="g"
          />
          <MacroProgressBar
            label="Carbohidratos"
            consumed={totals.carbs}
            target={plan.carbs_target_g}
            margin={plan.carbs_margin_g}
            unit="g"
          />
          <MacroProgressBar
            label="Grasas"
            consumed={totals.fat}
            target={plan.fat_target_g}
            margin={plan.fat_margin_g}
            unit="g"
          />
        </div>
        {hints.length > 0 && (
          <ul className="mt-3 space-y-0.5">
            {hints.map((h) => (
              <li key={h} className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">
                {h}
              </li>
            ))}
          </ul>
        )}
        {plan.notes && (
          <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">
              Notas del entrenador:{' '}
            </span>
            {plan.notes}
          </p>
        )}
      </Card>

      <Card padding="sm" rounded="xl">
        <h2 className="section-title mb-3">Comidas del día</h2>
        {logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Sin registros para esta fecha.
          </p>
        ) : (
          <div className="space-y-4">
            {logsByMeal.map(({ type, items }) => (
              <div key={type}>
                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {MEAL_TYPE_LABELS[type]}
                </p>
                <ul className="space-y-1.5">
                  {items.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                          {log.description}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
                          {log.calories} kcal · P {log.protein_g}g · C {log.carbs_g}g · G{' '}
                          {log.fat_g}g
                        </p>
                      </div>
                      {canEditLogs && (
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            onClick={() => openEditMeal(log)}
                            className="hover:text-brand hover:bg-brand/10 rounded-lg p-1.5 text-zinc-400 dark:text-zinc-300"
                            aria-label="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteMeal(log)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
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

      {summary && summary.days.length > 0 && (
        <Card padding="sm" rounded="xl">
          <h2 className="section-title mb-3">Últimos 7 días</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {summary.days.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  'rounded-lg border p-2 text-left transition-colors',
                  day.date === selectedDate
                    ? 'border-brand bg-brand/5'
                    : 'border-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                )}
              >
                <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {format(new Date(day.date + 'T12:00:00'), 'EEE d MMM', { locale: es })}
                </p>
                <AdherenceBar
                  percent={day.adherence_percent}
                  status={day.calories_status}
                  label={`${day.totals.calories} kcal`}
                />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={showMealModal}
        onClose={() => !saving && setShowMealModal(false)}
        title={editingLog ? 'Editar comida' : 'Registrar comida'}
        maxWidth="md"
      >
        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
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
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
