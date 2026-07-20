import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="page-stack-tight mx-auto max-w-lg">
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
            <Button size="sm" onClick={openAddMeal} disabled={!canEditLogs}>
              <Plus className="h-4 w-4" />
              Registrar
            </Button>
          </div>
        }
      />

      <WeekDateStrip selectedDate={selectedDate} onSelect={setSelectedDate} className="px-1" />

      <section className="pt-2 pb-1">
        <CalorieSemiGauge
          consumed={totals.calories}
          target={plan.calories_target}
          date={selectedDate}
        />
      </section>

      <section className="grid grid-cols-3 gap-1 px-1 pt-2 pb-4 sm:gap-4">
        <MacroRing
          label="Proteína"
          consumed={totals.protein}
          target={plan.protein_target_g}
          colorClass="text-amber-400 dark:text-amber-300"
          unit="g"
          icon={Beef}
        />
        <MacroRing
          label="Carbos"
          consumed={totals.carbs}
          target={plan.carbs_target_g}
          colorClass="text-orange-500"
          unit="g"
          icon={Wheat}
        />
        <MacroRing
          label="Grasas"
          consumed={totals.fat}
          target={plan.fat_target_g}
          colorClass="text-rose-500"
          unit="g"
          icon={Droplet}
        />
      </section>

      {hints.length > 0 && (
        <ul className="space-y-1 px-1 pb-2">
          {hints.map((h) => (
            <li
              key={h}
              className="rounded-xl bg-zinc-100/80 px-3 py-1.5 text-center text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {h}
            </li>
          ))}
        </ul>
      )}

      {plan.notes && (
        <p className="px-1 pb-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Entrenador: </span>
          {plan.notes}
        </p>
      )}

      <Card padding="sm" rounded="xl" className="border-zinc-200/80 dark:border-zinc-800">
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
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <UtensilsCrossed className="h-5 w-5 text-zinc-400" />
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
            <Button type="submit" loading={saving} disabled={!mealForm.description.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
