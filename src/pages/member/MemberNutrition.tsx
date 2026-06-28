import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import {
  UtensilsCrossed,
  Target,
  Save,
  History,
  MessageSquare,
  Dumbbell,
} from 'lucide-react';
import {
  Button,
  Card,
  PageHeader,
  Label,
  Input,
  Textarea,
  Spinner,
  PageState,
  Breadcrumbs,
  Avatar,
  BackToDashboardLink,
} from '../../components/ui';
import { AdherenceBar } from '../../components/nutrition/MacroProgressBar';
import {
  useNutritionPlanQuery,
  useNutritionSummaryQuery,
  useInvalidateNutrition,
  fetchMemberGoal,
} from '../../hooks/queries/useNutritionQuery';
import { cn } from '../../lib/utils';

const defaultPlanForm = {
  title: 'Plan nutricional',
  calories_target: '2000',
  protein_target_g: '150',
  carbs_target_g: '200',
  fat_target_g: '65',
  calories_margin: '150',
  protein_margin_g: '15',
  carbs_margin_g: '15',
  fat_margin_g: '10',
  notes: '',
};

export default function MemberNutrition() {
  const { id } = useParams();
  const memberId = id ? parseInt(id, 10) : NaN;
  const navigate = useNavigate();
  const invalidate = useInvalidateNutrition();

  const [member, setMember] = useState<{ full_name: string; goal: string | null; profile_image: string | null } | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);
  const [planForm, setPlanForm] = useState(defaultPlanForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const { data: plan, isPending: planLoading } = useNutritionPlanQuery(Number.isNaN(memberId) ? undefined : memberId);
  const { data: summary, isPending: summaryLoading } = useNutritionSummaryQuery(
    Number.isNaN(memberId) ? undefined : memberId,
    7
  );

  useEffect(() => {
    if (Number.isNaN(memberId)) return;
    setMemberLoading(true);
    Promise.all([
      apiFetch(`/api/users/${memberId}`).then((r) => parseJsonResponse<{ full_name: string; profile_image: string | null }>(r)),
      fetchMemberGoal(memberId),
    ])
      .then(([userData, goal]) => setMember({ ...userData, goal }))
      .catch(() => setMember(null))
      .finally(() => setMemberLoading(false));
  }, [memberId]);

  useEffect(() => {
    if (!plan) return;
    setPlanForm({
      title: plan.title,
      calories_target: String(plan.calories_target),
      protein_target_g: String(plan.protein_target_g),
      carbs_target_g: String(plan.carbs_target_g),
      fat_target_g: String(plan.fat_target_g),
      calories_margin: String(plan.calories_margin),
      protein_margin_g: String(plan.protein_margin_g),
      carbs_margin_g: String(plan.carbs_margin_g),
      fat_margin_g: String(plan.fat_margin_g),
      notes: plan.notes ?? '',
    });
  }, [plan]);

  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    if (Number.isNaN(memberId)) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      const res = await apiFetch(`/api/users/${memberId}/nutrition/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: planForm.title.trim(),
          calories_target: parseInt(planForm.calories_target, 10),
          protein_target_g: parseInt(planForm.protein_target_g, 10),
          carbs_target_g: parseInt(planForm.carbs_target_g, 10),
          fat_target_g: parseInt(planForm.fat_target_g, 10),
          calories_margin: parseInt(planForm.calories_margin, 10),
          protein_margin_g: parseInt(planForm.protein_margin_g, 10),
          carbs_margin_g: parseInt(planForm.carbs_margin_g, 10),
          fat_margin_g: parseInt(planForm.fat_margin_g, 10),
          notes: planForm.notes.trim() || null,
        }),
      });
      await parseJsonResponse(res);
      invalidate(memberId);
      setSaveMsg('Plan guardado');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (memberLoading || planLoading) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-zinc-500 text-xs">Cargando…</p>
      </PageState>
    );
  }

  if (!member || Number.isNaN(memberId)) {
    return <div className="text-zinc-500 p-6">Miembro no encontrado</div>;
  }

  const avgAdherence =
    summary && summary.days.length > 0
      ? Math.round(summary.days.reduce((s, d) => s + d.adherence_percent, 0) / summary.days.length)
      : null;

  return (
    <div className="page-stack-tight max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'Miembros', href: '/members' },
          { label: member.full_name, href: `/members/${memberId}/routines` },
          { label: 'Nutrición' },
        ]}
      />

      <PageHeader
        compact
        title={
          <>
            Nutrición de <span className="text-brand">{member.full_name}</span>
          </>
        }
        subtitle="Metas diarias y adherencia"
        action={
          <div className="flex items-center gap-1.5 shrink-0">
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => navigate(`/members/${memberId}/routines`)}
              title="Rutinas"
              aria-label="Rutinas"
            >
              <Dumbbell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => navigate(`/members/${memberId}/history`)}
              title="Historial"
              aria-label="Historial"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => navigate(`/messages?member=${memberId}`)}
              title="Mensaje"
              aria-label="Mensaje"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <Avatar src={member.profile_image} name={member.full_name} size="md" className="rounded-xl" />
        {member.goal && (
          <div className="min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 px-3 py-2 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Objetivo del miembro
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 line-clamp-2">{member.goal}</p>
          </div>
        )}
      </div>

      <Card padding="sm" rounded="xl">
        <h2 className="section-title mb-3 flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-brand" />
          Plan nutricional
        </h2>
        {saveMsg && <p className="text-xs text-emerald-600 mb-2">{saveMsg}</p>}
        {saveError && <p className="text-xs text-red-500 mb-2">{saveError}</p>}
        <form onSubmit={handleSavePlan} className="space-y-3">
          <div>
            <Label>Título del plan</Label>
            <Input
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label>kcal / día</Label>
              <Input
                type="number"
                min={1}
                value={planForm.calories_target}
                onChange={(e) => setPlanForm({ ...planForm, calories_target: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Proteína (g)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.protein_target_g}
                onChange={(e) => setPlanForm({ ...planForm, protein_target_g: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Carbos (g)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.carbs_target_g}
                onChange={(e) => setPlanForm({ ...planForm, carbs_target_g: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Grasas (g)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.fat_target_g}
                onChange={(e) => setPlanForm({ ...planForm, fat_target_g: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label>± kcal</Label>
              <Input
                type="number"
                min={0}
                value={planForm.calories_margin}
                onChange={(e) => setPlanForm({ ...planForm, calories_margin: e.target.value })}
              />
            </div>
            <div>
              <Label>± proteína (g)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.protein_margin_g}
                onChange={(e) => setPlanForm({ ...planForm, protein_margin_g: e.target.value })}
              />
            </div>
            <div>
              <Label>± carbos (g)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.carbs_margin_g}
                onChange={(e) => setPlanForm({ ...planForm, carbs_margin_g: e.target.value })}
              />
            </div>
            <div>
              <Label>± grasas (g)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.fat_margin_g}
                onChange={(e) => setPlanForm({ ...planForm, fat_margin_g: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Notas para el cliente</Label>
            <Textarea
              value={planForm.notes}
              onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
              placeholder="Indicaciones, horarios, preferencias…"
              rows={3}
            />
          </div>
          <Button type="submit" disabled={saving} size="sm">
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {plan ? 'Actualizar plan' : 'Crear plan'}
          </Button>
        </form>
      </Card>

      <Card padding="sm" rounded="xl">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="section-title">Adherencia (7 días)</h2>
          {avgAdherence != null && (
            <span
              className={cn(
                'text-xs font-bold tabular-nums',
                avgAdherence >= 75 ? 'text-emerald-600' : avgAdherence >= 50 ? 'text-amber-600' : 'text-red-500'
              )}
            >
              Promedio {avgAdherence}%
            </span>
          )}
        </div>
        {summaryLoading && !summary ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : !plan ? (
          <p className="text-sm text-zinc-500 py-4 text-center">
            Guarda un plan nutricional arriba para ver la adherencia del cliente.
          </p>
        ) : !summary || summary.days.every((d) => d.totals.calories === 0) ? (
          <p className="text-sm text-zinc-500 py-4 text-center">
            El cliente aún no ha registrado comidas esta semana.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.days.map((day) => (
              <div
                key={day.date}
                className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {format(new Date(day.date + 'T12:00:00'), 'EEE d MMM', { locale: es })}
                  </p>
                  <p className="text-[10px] text-zinc-500 tabular-nums">
                    {day.totals.calories} kcal · P {Math.round(day.totals.protein)}g · C {Math.round(day.totals.carbs)}g · G{' '}
                    {Math.round(day.totals.fat)}g
                  </p>
                </div>
                <AdherenceBar percent={day.adherence_percent} status={day.calories_status} label="Cumplimiento" />
              </div>
            ))}
          </div>
        )}
        {!plan && (
          <p className="text-xs text-zinc-500 mt-2">
            Guarda un plan arriba para que el cliente pueda ver sus metas en{' '}
            <Link to="/nutrition" className="text-brand font-semibold hover:underline">
              Mi nutrición
            </Link>
            .
          </p>
        )}
      </Card>
    </div>
  );
}
