import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { requireMemberAccess } from './middleware/access.ts';
import { formatZodError } from '../lib/passwordPolicy.ts';
import {
  adherencePercent,
  formatLocalDate,
  getMacroStatus,
  type DailyNutritionSummary,
  type MacroTotals,
  type MealType,
  type NutritionLogEntry,
  type NutritionPlan,
} from '../lib/nutrition.ts';

const router = asyncRouter();

const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

const planSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    calories_target: z.number().int().positive().max(10000),
    protein_target_g: z.number().int().min(0).max(1000),
    carbs_target_g: z.number().int().min(0).max(2000),
    fat_target_g: z.number().int().min(0).max(500),
    calories_margin: z.number().int().min(0).max(3000).optional(),
    protein_margin_g: z.number().int().min(0).max(200).optional(),
    carbs_margin_g: z.number().int().min(0).max(200).optional(),
    fat_margin_g: z.number().int().min(0).max(200).optional(),
    notes: z.string().max(2000).nullable().optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    const maxMargin = (target: number) => Math.max(1, Math.floor(target * 0.3));
    if ((data.calories_margin ?? 150) > maxMargin(data.calories_target)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Margen de kcal demasiado alto',
        path: ['calories_margin'],
      });
    }
    if ((data.protein_margin_g ?? 15) > maxMargin(data.protein_target_g)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Margen de proteína demasiado alto',
        path: ['protein_margin_g'],
      });
    }
  });

const logSchema = z.object({
  meal_type: mealTypeSchema,
  description: z.string().min(1).max(500),
  calories: z.number().int().min(0).max(20000),
  protein_g: z.number().min(0).max(2000).optional(),
  carbs_g: z.number().min(0).max(2000).optional(),
  fat_g: z.number().min(0).max(2000).optional(),
  logged_at: z.string().optional(),
});

const logPatchSchema = logSchema.partial();

function parseUserId(param: string): number | null {
  const id = parseInt(param, 10);
  return Number.isNaN(id) ? null : id;
}

function isValidDateParam(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function rowToPlan(row: Record<string, unknown>): NutritionPlan {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    trainer_id: Number(row.trainer_id),
    title: String(row.title),
    calories_target: Number(row.calories_target),
    protein_target_g: Number(row.protein_target_g),
    carbs_target_g: Number(row.carbs_target_g),
    fat_target_g: Number(row.fat_target_g),
    calories_margin: Number(row.calories_margin),
    protein_margin_g: Number(row.protein_margin_g),
    carbs_margin_g: Number(row.carbs_margin_g),
    fat_margin_g: Number(row.fat_margin_g),
    notes: row.notes != null ? String(row.notes) : null,
    start_date: row.start_date != null ? String(row.start_date).slice(0, 10) : null,
    end_date: row.end_date != null ? String(row.end_date).slice(0, 10) : null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToLog(row: Record<string, unknown>): NutritionLogEntry {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    logged_at: String(row.logged_at),
    meal_type: row.meal_type as MealType,
    description: String(row.description),
    calories: Number(row.calories),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
    created_at: String(row.created_at),
  };
}

function totalsFromRow(row: Record<string, unknown>): MacroTotals {
  return {
    calories: Number(row.calories ?? 0),
    protein: Number(row.protein ?? 0),
    carbs: Number(row.carbs ?? 0),
    fat: Number(row.fat ?? 0),
  };
}

function trainerCanEditPlan(user: AuthRequest['user']): boolean {
  return user?.role === 'admin' || user?.role === 'trainer';
}

router.get(
  '/users/:id/nutrition/plan',
  requireMemberAccess('id'),
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.id);
    if (userId === null) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { rows } = await query(
      `SELECT * FROM nutrition_plans WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [userId]
    );

    if (!rows[0]) {
      res.status(404).json({ error: 'Sin plan nutricional' });
      return;
    }

    res.json(rowToPlan(rows[0]));
  })
);

router.put(
  '/users/:id/nutrition/plan',
  requireMemberAccess('id'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!trainerCanEditPlan(req.user)) {
      res.status(403).json({ error: 'Solo el entrenador puede definir el plan' });
      return;
    }

    const userId = parseUserId(req.params.id);
    if (userId === null) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const data = parsed.data;
    const trainerId = req.user!.id;

    const { rows } = await query(
      `INSERT INTO nutrition_plans (
        user_id, trainer_id, title,
        calories_target, protein_target_g, carbs_target_g, fat_target_g,
        calories_margin, protein_margin_g, carbs_margin_g, fat_margin_g,
        notes, start_date, end_date, is_active, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        trainer_id = EXCLUDED.trainer_id,
        title = EXCLUDED.title,
        calories_target = EXCLUDED.calories_target,
        protein_target_g = EXCLUDED.protein_target_g,
        carbs_target_g = EXCLUDED.carbs_target_g,
        fat_target_g = EXCLUDED.fat_target_g,
        calories_margin = EXCLUDED.calories_margin,
        protein_margin_g = EXCLUDED.protein_margin_g,
        carbs_margin_g = EXCLUDED.carbs_margin_g,
        fat_margin_g = EXCLUDED.fat_margin_g,
        notes = EXCLUDED.notes,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        is_active = true,
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        trainerId,
        data.title ?? 'Plan nutricional',
        data.calories_target,
        data.protein_target_g,
        data.carbs_target_g,
        data.fat_target_g,
        data.calories_margin ?? 150,
        data.protein_margin_g ?? 15,
        data.carbs_margin_g ?? 15,
        data.fat_margin_g ?? 10,
        data.notes ?? null,
        data.start_date ?? null,
        data.end_date ?? null,
      ]
    );

    res.json(rowToPlan(rows[0]));
  })
);

router.get(
  '/users/:id/nutrition/logs',
  requireMemberAccess('id'),
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.id);
    if (userId === null) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const dateParam =
      typeof req.query.date === 'string' ? req.query.date : formatLocalDate(new Date());
    if (!isValidDateParam(dateParam)) {
      res.status(400).json({ error: 'Fecha inválida' });
      return;
    }

    const { rows } = await query(
      `SELECT id, user_id, logged_at, meal_type, description, calories, protein_g, carbs_g, fat_g, created_at
       FROM nutrition_log_entries
       WHERE user_id = $1
         AND logged_at >= $2::date
         AND logged_at < ($2::date + INTERVAL '1 day')
       ORDER BY logged_at ASC`,
      [userId, dateParam]
    );

    res.json(rows.map((r) => rowToLog(r as Record<string, unknown>)));
  })
);

router.post(
  '/users/:id/nutrition/logs',
  requireMemberAccess('id'),
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = parseUserId(req.params.id);
    if (userId === null) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    if (req.user!.id !== userId) {
      res.status(403).json({ error: 'Solo puedes registrar tus propias comidas' });
      return;
    }

    const parsed = logSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const data = parsed.data;
    const { rows } = await query(
      `INSERT INTO nutrition_log_entries (
        user_id, logged_at, meal_type, description, calories, protein_g, carbs_g, fat_g
      ) VALUES ($1, COALESCE($2::timestamptz, NOW()), $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, logged_at, meal_type, description, calories, protein_g, carbs_g, fat_g, created_at`,
      [
        userId,
        data.logged_at ?? null,
        data.meal_type,
        data.description,
        data.calories,
        data.protein_g ?? 0,
        data.carbs_g ?? 0,
        data.fat_g ?? 0,
      ]
    );

    res.status(201).json(rowToLog(rows[0]));
  })
);

router.get(
  '/users/:id/nutrition/summary',
  requireMemberAccess('id'),
  asyncHandler(async (req, res) => {
    const userId = parseUserId(req.params.id);
    if (userId === null) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const days = Math.min(31, Math.max(1, parseInt(String(req.query.days ?? '7'), 10) || 7));

    const { rows: planRows } = await query(
      `SELECT * FROM nutrition_plans WHERE user_id = $1 AND is_active = true LIMIT 1`,
      [userId]
    );

    if (!planRows[0]) {
      res.status(404).json({ error: 'Sin plan nutricional' });
      return;
    }

    const plan = rowToPlan(planRows[0]);
    const endDate = formatLocalDate(new Date());
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startDate = formatLocalDate(start);

    const { rows: aggRows } = await query(
      `SELECT
        (logged_at AT TIME ZONE 'UTC')::date AS day,
        COALESCE(SUM(calories), 0)::int AS calories,
        COALESCE(SUM(protein_g), 0)::float AS protein,
        COALESCE(SUM(carbs_g), 0)::float AS carbs,
        COALESCE(SUM(fat_g), 0)::float AS fat
       FROM nutrition_log_entries
       WHERE user_id = $1
         AND (logged_at AT TIME ZONE 'UTC')::date >= $2::date
         AND (logged_at AT TIME ZONE 'UTC')::date <= $3::date
       GROUP BY day
       ORDER BY day ASC`,
      [userId, startDate, endDate]
    );

    const byDate = new Map<string, MacroTotals>();
    for (const row of aggRows) {
      const d = String((row as Record<string, unknown>).day).slice(0, 10);
      byDate.set(d, totalsFromRow(row));
    }

    const summaries: DailyNutritionSummary[] = [];
    const cursor = new Date(start);
    const end = new Date();
    while (cursor <= end) {
      const date = formatLocalDate(cursor);
      const totals = byDate.get(date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
      summaries.push({
        date,
        totals,
        adherence_percent: adherencePercent(plan, totals),
        calories_status: getMacroStatus(
          totals.calories,
          plan.calories_target,
          plan.calories_margin
        ),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ plan, days: summaries });
  })
);

router.patch(
  '/nutrition/logs/:logId',
  asyncHandler(async (req: AuthRequest, res) => {
    const logId = parseInt(req.params.logId, 10);
    if (Number.isNaN(logId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const parsed = logPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error) });
      return;
    }

    const { rows: existing } = await query<{ user_id: number }>(
      `SELECT user_id FROM nutrition_log_entries WHERE id = $1`,
      [logId]
    );

    if (!existing[0]) {
      res.status(404).json({ error: 'Registro no encontrado' });
      return;
    }

    if (req.user!.id !== existing[0].user_id) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }

    const data = parsed.data;
    const { rows } = await query(
      `UPDATE nutrition_log_entries SET
        meal_type = COALESCE($2, meal_type),
        description = COALESCE($3, description),
        calories = COALESCE($4, calories),
        protein_g = COALESCE($5, protein_g),
        carbs_g = COALESCE($6, carbs_g),
        fat_g = COALESCE($7, fat_g),
        logged_at = COALESCE($8::timestamptz, logged_at)
       WHERE id = $1
       RETURNING id, user_id, logged_at, meal_type, description, calories, protein_g, carbs_g, fat_g, created_at`,
      [
        logId,
        data.meal_type ?? null,
        data.description ?? null,
        data.calories ?? null,
        data.protein_g ?? null,
        data.carbs_g ?? null,
        data.fat_g ?? null,
        data.logged_at ?? null,
      ]
    );

    res.json(rowToLog(rows[0]));
  })
);

router.delete(
  '/nutrition/logs/:logId',
  asyncHandler(async (req: AuthRequest, res) => {
    const logId = parseInt(req.params.logId, 10);
    if (Number.isNaN(logId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const { rows: existing } = await query<{ user_id: number }>(
      `SELECT user_id FROM nutrition_log_entries WHERE id = $1`,
      [logId]
    );

    if (!existing[0]) {
      res.status(404).json({ error: 'Registro no encontrado' });
      return;
    }

    if (req.user!.id !== existing[0].user_id) {
      res.status(403).json({ error: 'Permisos insuficientes' });
      return;
    }

    await query(`DELETE FROM nutrition_log_entries WHERE id = $1`, [logId]);
    res.json({ ok: true });
  })
);

router.get(
  '/admin/overview',
  authorize(['admin']),
  asyncHandler(async (_req, res) => {
    const days = 7;
    const endDate = formatLocalDate(new Date());
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startDate = formatLocalDate(start);

    const { rows: members } = await query<{
      user_id: number;
      full_name: string;
      plan_title: string;
      calories_target: number;
      calories_margin: number;
      protein_target_g: number;
      protein_margin_g: number;
      carbs_target_g: number;
      carbs_margin_g: number;
      fat_target_g: number;
      fat_margin_g: number;
    }>(
      `SELECT u.id AS user_id, u.full_name, np.title AS plan_title,
              np.calories_target, np.calories_margin,
              np.protein_target_g, np.protein_margin_g,
              np.carbs_target_g, np.carbs_margin_g,
              np.fat_target_g, np.fat_margin_g
       FROM users u
       INNER JOIN nutrition_plans np ON np.user_id = u.id AND np.is_active = true
       WHERE u.role = 'member' AND u.status = 'active'
       ORDER BY u.full_name ASC`
    );

    const overview = await Promise.all(
      members.map(async (member) => {
        const { rows: aggRows } = await query(
          `SELECT
            COALESCE(SUM(calories), 0)::int AS calories,
            COALESCE(SUM(protein_g), 0)::float AS protein,
            COALESCE(SUM(carbs_g), 0)::float AS carbs,
            COALESCE(SUM(fat_g), 0)::float AS fat,
            COUNT(DISTINCT (logged_at AT TIME ZONE 'UTC')::date)::int AS logged_days
           FROM nutrition_log_entries
           WHERE user_id = $1
             AND (logged_at AT TIME ZONE 'UTC')::date >= $2::date
             AND (logged_at AT TIME ZONE 'UTC')::date <= $3::date`,
          [member.user_id, startDate, endDate]
        );

        const totals = totalsFromRow(aggRows[0]);
        const loggedDays = Number((aggRows[0] as Record<string, unknown>)?.logged_days ?? 0);
        const plan: NutritionPlan = {
          id: 0,
          user_id: member.user_id,
          trainer_id: 0,
          title: member.plan_title,
          calories_target: member.calories_target,
          protein_target_g: member.protein_target_g,
          carbs_target_g: member.carbs_target_g,
          fat_target_g: member.fat_target_g,
          calories_margin: member.calories_margin,
          protein_margin_g: member.protein_margin_g,
          carbs_margin_g: member.carbs_margin_g,
          fat_margin_g: member.fat_margin_g,
          notes: null,
          start_date: null,
          end_date: null,
          is_active: true,
          created_at: '',
          updated_at: '',
        };

        const dailyAdherence =
          loggedDays > 0
            ? Math.round(
                adherencePercent(plan, {
                  calories: Math.round(totals.calories / loggedDays),
                  protein: totals.protein / loggedDays,
                  carbs: totals.carbs / loggedDays,
                  fat: totals.fat / loggedDays,
                })
              )
            : 0;

        return {
          user_id: member.user_id,
          full_name: member.full_name,
          plan_title: member.plan_title,
          logged_days: loggedDays,
          adherence_percent: dailyAdherence,
          calories_status: getMacroStatus(
            totals.calories,
            plan.calories_target * Math.max(loggedDays, 1),
            plan.calories_margin * Math.max(loggedDays, 1)
          ),
        };
      })
    );

    res.json({
      period_days: days,
      start_date: startDate,
      end_date: endDate,
      members: overview,
      with_plan: overview.length,
      logging_active: overview.filter((m) => m.logged_days > 0).length,
    });
  })
);

export default router;
