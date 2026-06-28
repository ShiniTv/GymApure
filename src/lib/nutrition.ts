export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

export type MacroStatus = 'on_track' | 'under' | 'over' | 'near_low' | 'near_high' | 'no_target';

export interface NutritionPlan {
  id: number;
  user_id: number;
  trainer_id: number;
  title: string;
  calories_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  calories_margin: number;
  protein_margin_g: number;
  carbs_margin_g: number;
  fat_margin_g: number;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionLogEntry {
  id: number;
  user_id: number;
  logged_at: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyNutritionSummary {
  date: string;
  totals: MacroTotals;
  adherence_percent: number;
  calories_status: MacroStatus;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function sumLogEntries(entries: NutritionLogEntry[]): MacroTotals {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + Number(e.calories),
      protein: round1(acc.protein + Number(e.protein_g)),
      carbs: round1(acc.carbs + Number(e.carbs_g)),
      fat: round1(acc.fat + Number(e.fat_g)),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function getMacroStatus(
  consumed: number,
  target: number,
  margin: number
): MacroStatus {
  if (target <= 0) return 'no_target';
  const low = target - margin;
  const high = target + margin;
  if (consumed >= low && consumed <= high) {
    const edge = margin * 0.2;
    if (consumed <= low + edge) return 'near_low';
    if (consumed >= high - edge) return 'near_high';
    return 'on_track';
  }
  return consumed < low ? 'under' : 'over';
}

export function getPlanMacroStatus(
  plan: NutritionPlan,
  totals: MacroTotals,
  key: MacroKey
): MacroStatus {
  switch (key) {
    case 'calories':
      return getMacroStatus(totals.calories, plan.calories_target, plan.calories_margin);
    case 'protein':
      return getMacroStatus(totals.protein, plan.protein_target_g, plan.protein_margin_g);
    case 'carbs':
      return getMacroStatus(totals.carbs, plan.carbs_target_g, plan.carbs_margin_g);
    case 'fat':
      return getMacroStatus(totals.fat, plan.fat_target_g, plan.fat_margin_g);
  }
}

export function adherencePercent(plan: NutritionPlan, totals: MacroTotals): number {
  const statuses = [
    getPlanMacroStatus(plan, totals, 'calories'),
    getPlanMacroStatus(plan, totals, 'protein'),
    getPlanMacroStatus(plan, totals, 'carbs'),
    getPlanMacroStatus(plan, totals, 'fat'),
  ];
  const onTrack = statuses.filter((s) => s === 'on_track' || s === 'near_low' || s === 'near_high').length;
  return Math.round((onTrack / 4) * 100);
}

export function macroStatusLabel(status: MacroStatus): string {
  switch (status) {
    case 'on_track':
      return 'En rango';
    case 'near_low':
    case 'near_high':
      return 'Cerca del límite';
    case 'under':
      return 'Por debajo';
    case 'over':
      return 'Por encima';
    default:
      return '—';
  }
}

export function macroStatusColorClass(status: MacroStatus): string {
  switch (status) {
    case 'on_track':
      return 'bg-emerald-500';
    case 'near_low':
    case 'near_high':
      return 'bg-amber-500';
    case 'under':
    case 'over':
      return 'bg-red-500';
    default:
      return 'bg-zinc-300 dark:bg-zinc-600';
  }
}

export function macroHint(
  plan: NutritionPlan,
  totals: MacroTotals,
  key: MacroKey
): string | null {
  const config = {
    calories: { consumed: totals.calories, target: plan.calories_target, margin: plan.calories_margin, unit: 'kcal' },
    protein: { consumed: totals.protein, target: plan.protein_target_g, margin: plan.protein_margin_g, unit: 'g P' },
    carbs: { consumed: totals.carbs, target: plan.carbs_target_g, margin: plan.carbs_margin_g, unit: 'g C' },
    fat: { consumed: totals.fat, target: plan.fat_target_g, margin: plan.fat_margin_g, unit: 'g G' },
  }[key];

  const status = getMacroStatus(config.consumed, config.target, config.margin);
  const diff = Math.abs(config.consumed - config.target);
  if (status === 'on_track' || status === 'near_low' || status === 'near_high') return null;
  if (status === 'under') {
    return `Te faltan ${Math.round(config.target - config.consumed)} ${config.unit}`;
  }
  return `Superaste en ${Math.round(diff)} ${config.unit}`;
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function lastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}
