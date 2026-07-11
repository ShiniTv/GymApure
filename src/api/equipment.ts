import { z } from 'zod';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { asyncHandler } from './middleware/asyncHandler.ts';
import { query } from '../db/index.ts';
import { AuthRequest, authorize } from './middleware/auth.ts';
import { logAudit } from '../lib/audit.ts';
import { uploadRateLimiter } from './middleware/rateLimit.ts';
import { avatarUpload } from '../lib/uploadStorage.ts';
import { uploadMediaFile, deleteMediaFile, isMediaStorageRemote } from '../lib/mediaStorage.ts';
import { localAvatarPathFromUpload } from '../lib/mediaStorage.ts';
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_EVENT_TYPES,
} from '../lib/equipment/constants.ts';
import { STAFF_ROLES } from '../lib/roles.ts';
import {
  syncEquipmentInspectionAlerts,
  getEquipmentStatsSummary,
} from '../lib/equipmentInspectionAlerts.ts';

const router = asyncRouter();

const staffRead = authorize(STAFF_ROLES);
const adminOnly = authorize(['admin']);

const zoneSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
});

const vendorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z
    .union([z.string().trim().email(), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const catalogSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(EQUIPMENT_CATEGORIES),
  description: z.string().trim().max(500).optional().nullable(),
  typical_brands: z.string().trim().max(200).optional().nullable(),
});

const equipmentSchema = z.object({
  catalog_id: z.coerce.number().int().positive().optional().nullable(),
  custom_name: z.string().trim().max(120).optional().nullable(),
  zone_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(EQUIPMENT_STATUSES).optional(),
  brand: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(80).optional().nullable(),
  serial_number: z.string().trim().max(80).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  installed_at: z.string().optional().nullable(),
  warranty_until: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  next_inspection_at: z.string().optional().nullable(),
});

const eventSchema = z.object({
  event_type: z.enum(EQUIPMENT_EVENT_TYPES).optional(),
  description: z.string().trim().min(3).max(2000),
  vendor_id: z.coerce.number().int().positive().optional().nullable(),
  cost_usd: z.coerce.number().min(0).optional().nullable(),
  performed_at: z.string().optional().nullable(),
  new_status: z.enum(EQUIPMENT_STATUSES).optional().nullable(),
});

const retireSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

function mapEquipmentRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    catalog_id: row.catalog_id,
    catalog_name: row.catalog_name,
    catalog_category: row.catalog_category,
    custom_name: row.custom_name,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    status: row.status,
    brand: row.brand,
    model: row.model,
    serial_number: row.serial_number,
    quantity: row.quantity,
    installed_at: row.installed_at,
    warranty_until: row.warranty_until,
    notes: row.notes,
    photo_url: row.photo_url,
    next_inspection_at: row.next_inspection_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const equipmentSelect = `
  SELECT ge.*,
         ec.name AS catalog_name,
         ec.category::text AS catalog_category,
         gz.name AS zone_name
  FROM gym_equipment ge
  LEFT JOIN equipment_catalog ec ON ec.id = ge.catalog_id
  LEFT JOIN gym_zones gz ON gz.id = ge.zone_id
`;

const DUPLICATE_EQUIPMENT_MESSAGE =
  'Este equipo ya está registrado. Edítalo para cambiar la cantidad.';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

async function findExistingEquipment(
  catalogId: number | null | undefined,
  customName: string | null | undefined,
  excludeId?: number
): Promise<{ id: number } | null> {
  if (catalogId) {
    const params: unknown[] = [catalogId];
    let sql = `SELECT id FROM gym_equipment WHERE catalog_id = $1`;
    if (excludeId) {
      params.push(excludeId);
      sql += ` AND id <> $${params.length}`;
    }
    sql += ` LIMIT 1`;
    const { rows } = await query<{ id: number }>(sql, params);
    return rows[0] ?? null;
  }

  const name = customName?.trim();
  if (!name) return null;

  const params: unknown[] = [name];
  let sql = `
    SELECT id FROM gym_equipment
    WHERE catalog_id IS NULL
      AND LOWER(TRIM(custom_name)) = LOWER($1)`;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id <> $${params.length}`;
  }
  sql += ` LIMIT 1`;
  const { rows } = await query<{ id: number }>(sql, params);
  return rows[0] ?? null;
}

function sendDuplicateEquipmentError(
  res: { status: (code: number) => { json: (body: unknown) => void } },
  existingId: number
) {
  res.status(409).json({
    error: DUPLICATE_EQUIPMENT_MESSAGE,
    details: { existing_id: existingId },
  });
}

router.get(
  '/bootstrap',
  staffRead,
  asyncHandler(async (req: AuthRequest, res) => {
    const isAdmin = req.user!.role === 'admin';
    const [zones, catalog, vendors, stats] = await Promise.all([
      query(`SELECT * FROM gym_zones ORDER BY sort_order, name`),
      query(`SELECT * FROM equipment_catalog ORDER BY category, name`),
      isAdmin
        ? query(`SELECT * FROM equipment_vendors ORDER BY name`)
        : Promise.resolve({ rows: [] }),
      getEquipmentStatsSummary(),
    ]);
    res.json({
      zones: zones.rows,
      catalog: catalog.rows,
      vendors: vendors.rows,
      stats,
    });
  })
);

router.get(
  '/zones',
  staffRead,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT * FROM gym_zones ORDER BY sort_order, name`);
    res.json(rows);
  })
);

router.post(
  '/zones',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = zoneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const { name, sort_order } = parsed.data;
    const { rows } = await query(
      `INSERT INTO gym_zones (name, sort_order) VALUES ($1, $2) RETURNING *`,
      [name, sort_order ?? 0]
    );
    await logAudit(req.user!.id, 'equipment_zone_create', { name });
    res.status(201).json(rows[0]);
  })
);

router.patch(
  '/zones/:id',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = zoneSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const fields = parsed.data;
    const { rows } = await query(
      `UPDATE gym_zones
       SET name = COALESCE($2, name),
           sort_order = COALESCE($3, sort_order)
       WHERE id = $1
       RETURNING *`,
      [req.params.id, fields.name ?? null, fields.sort_order ?? null]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Zona no encontrada' });
      return;
    }
    res.json(rows[0]);
  })
);

router.delete(
  '/zones/:id',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const { rowCount } = await query(`DELETE FROM gym_zones WHERE id = $1`, [req.params.id]);
    if (!rowCount) {
      res.status(404).json({ error: 'Zona no encontrada' });
      return;
    }
    res.json({ success: true });
  })
);

router.get(
  '/catalog',
  staffRead,
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (
      category &&
      EQUIPMENT_CATEGORIES.includes(category as (typeof EQUIPMENT_CATEGORIES)[number])
    ) {
      params.push(category);
      clauses.push(`category = $${params.length}::equipment_category`);
    }
    if (q) {
      params.push(`%${q}%`);
      clauses.push(`name ILIKE $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM equipment_catalog ${where} ORDER BY category, name`,
      params
    );
    res.json(rows);
  })
);

router.post(
  '/catalog',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = catalogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const data = parsed.data;
    const { rows } = await query(
      `INSERT INTO equipment_catalog (name, category, description, typical_brands, is_system)
       VALUES ($1, $2::equipment_category, $3, $4, false)
       RETURNING *`,
      [data.name, data.category, data.description ?? null, data.typical_brands ?? null]
    );
    res.status(201).json(rows[0]);
  })
);

router.get(
  '/vendors',
  adminOnly,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT * FROM equipment_vendors ORDER BY name`);
    res.json(rows);
  })
);

router.post(
  '/vendors',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = vendorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const data = parsed.data;
    const { rows } = await query(
      `INSERT INTO equipment_vendors (name, contact_name, phone, email, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        data.name,
        data.contact_name ?? null,
        data.phone ?? null,
        data.email || null,
        data.notes ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  '/vendors/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const parsed = vendorSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const d = parsed.data;
    const { rows } = await query(
      `UPDATE equipment_vendors
       SET name = COALESCE($2, name),
           contact_name = COALESCE($3, contact_name),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           notes = COALESCE($6, notes)
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        d.name ?? null,
        d.contact_name ?? null,
        d.phone ?? null,
        d.email ?? null,
        d.notes ?? null,
      ]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }
    res.json(rows[0]);
  })
);

router.delete(
  '/vendors/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM equipment_vendors WHERE id = $1`, [
      req.params.id,
    ]);
    if (!rowCount) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }
    res.json({ success: true });
  })
);

router.get(
  '/',
  staffRead,
  asyncHandler(async (req, res) => {
    void syncEquipmentInspectionAlerts();
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const zoneId = req.query.zone_id ? Number(req.query.zone_id) : null;
    const category = typeof req.query.category === 'string' ? req.query.category : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const params: unknown[] = [];
    const clauses: string[] = [];

    if (status && EQUIPMENT_STATUSES.includes(status as (typeof EQUIPMENT_STATUSES)[number])) {
      params.push(status);
      clauses.push(`ge.status = $${params.length}::equipment_status`);
    }
    if (zoneId && Number.isFinite(zoneId)) {
      params.push(zoneId);
      clauses.push(`ge.zone_id = $${params.length}`);
    }
    if (
      category &&
      EQUIPMENT_CATEGORIES.includes(category as (typeof EQUIPMENT_CATEGORIES)[number])
    ) {
      params.push(category);
      clauses.push(`ec.category = $${params.length}::equipment_category`);
    }
    if (q) {
      params.push(`%${q}%`);
      clauses.push(
        `(ge.custom_name ILIKE $${params.length} OR ec.name ILIKE $${params.length} OR ge.brand ILIKE $${params.length} OR ge.model ILIKE $${params.length})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(`${equipmentSelect} ${where} ORDER BY ge.updated_at DESC`, params);
    res.json(rows.map((row) => mapEquipmentRow(row as Record<string, unknown>)));
  })
);

router.get(
  '/:id',
  staffRead,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${equipmentSelect} WHERE ge.id = $1`, [req.params.id]);
    if (!rows[0]) {
      res.status(404).json({ error: 'Equipo no encontrado' });
      return;
    }
    const events = await query(
      `SELECT eme.*, u.full_name AS created_by_name, ev.name AS vendor_name
       FROM equipment_maintenance_events eme
       LEFT JOIN users u ON u.id = eme.created_by
       LEFT JOIN equipment_vendors ev ON ev.id = eme.vendor_id
       WHERE eme.equipment_id = $1
       ORDER BY eme.performed_at DESC, eme.id DESC`,
      [req.params.id]
    );
    res.json({
      equipment: mapEquipmentRow(rows[0]),
      events: events.rows,
    });
  })
);

router.post(
  '/',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = equipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const data = parsed.data;
    if (!data.catalog_id && !data.custom_name?.trim()) {
      res
        .status(400)
        .json({ error: 'Selecciona un tipo del catálogo o indica un nombre personalizado' });
      return;
    }

    const existing = await findExistingEquipment(data.catalog_id, data.custom_name);
    if (existing) {
      sendDuplicateEquipmentError(res, existing.id);
      return;
    }

    let rows: { id: number }[];
    try {
      ({ rows } = await query(
        `INSERT INTO gym_equipment (
           catalog_id, custom_name, zone_id, status, brand, model, serial_number, quantity,
           installed_at, warranty_until, notes, next_inspection_at
         ) VALUES ($1, $2, $3, $4::equipment_status, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          data.catalog_id ?? null,
          data.custom_name?.trim() || null,
          data.zone_id ?? null,
          data.status ?? 'operational',
          data.brand ?? null,
          data.model ?? null,
          data.serial_number ?? null,
          data.quantity ?? 1,
          data.installed_at || null,
          data.warranty_until || null,
          data.notes ?? null,
          data.next_inspection_at || null,
        ]
      ));
    } catch (err) {
      if (isUniqueViolation(err)) {
        const fallback = await findExistingEquipment(data.catalog_id, data.custom_name);
        if (fallback) {
          sendDuplicateEquipmentError(res, fallback.id);
          return;
        }
      }
      throw err;
    }
    const id = rows[0].id;
    await logAudit(req.user!.id, 'equipment_create', { equipment_id: id });
    const detail = await query(`${equipmentSelect} WHERE ge.id = $1`, [id]);
    res.status(201).json(mapEquipmentRow(detail.rows[0]));
  })
);

router.patch(
  '/:id',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = equipmentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const current = await query<{
      status: string;
      catalog_id: number | null;
      custom_name: string | null;
    }>(`SELECT status::text, catalog_id, custom_name FROM gym_equipment WHERE id = $1`, [
      req.params.id,
    ]);
    if (!current.rows[0]) {
      res.status(404).json({ error: 'Equipo no encontrado' });
      return;
    }
    const data = parsed.data;
    const newStatus = data.status;

    const effectiveCatalogId =
      data.catalog_id !== undefined ? data.catalog_id : current.rows[0].catalog_id;
    const effectiveCustomName =
      data.custom_name !== undefined ? data.custom_name : current.rows[0].custom_name;

    const duplicate = await findExistingEquipment(
      effectiveCatalogId,
      effectiveCustomName,
      Number(req.params.id)
    );
    if (duplicate) {
      sendDuplicateEquipmentError(res, duplicate.id);
      return;
    }

    let rows: { id: number }[];
    try {
      ({ rows } = await query(
        `UPDATE gym_equipment SET
           catalog_id = COALESCE($2, catalog_id),
           custom_name = COALESCE($3, custom_name),
           zone_id = COALESCE($4, zone_id),
           status = COALESCE($5::equipment_status, status),
           brand = COALESCE($6, brand),
           model = COALESCE($7, model),
           serial_number = COALESCE($8, serial_number),
           quantity = COALESCE($9, quantity),
           installed_at = COALESCE($10, installed_at),
           warranty_until = COALESCE($11, warranty_until),
           notes = COALESCE($12, notes),
           next_inspection_at = COALESCE($13, next_inspection_at),
           updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [
          req.params.id,
          data.catalog_id ?? null,
          data.custom_name ?? null,
          data.zone_id ?? null,
          newStatus ?? null,
          data.brand ?? null,
          data.model ?? null,
          data.serial_number ?? null,
          data.quantity ?? null,
          data.installed_at ?? null,
          data.warranty_until ?? null,
          data.notes ?? null,
          data.next_inspection_at ?? null,
        ]
      ));
    } catch (err) {
      if (isUniqueViolation(err)) {
        const fallback = await findExistingEquipment(
          effectiveCatalogId,
          effectiveCustomName,
          Number(req.params.id)
        );
        if (fallback) {
          sendDuplicateEquipmentError(res, fallback.id);
          return;
        }
      }
      throw err;
    }
    if (newStatus && newStatus !== current.rows[0].status) {
      await query(
        `INSERT INTO equipment_maintenance_events (
           equipment_id, event_type, previous_status, new_status, description, created_by
         ) VALUES ($1, 'status_change', $2::equipment_status, $3::equipment_status, $4, $5)`,
        [
          req.params.id,
          current.rows[0].status,
          newStatus,
          'Estado actualizado por administración',
          req.user!.id,
        ]
      );
    }
    const detail = await query(`${equipmentSelect} WHERE ge.id = $1`, [rows[0].id]);
    res.json(mapEquipmentRow(detail.rows[0]));
  })
);

router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const { rows } = await query<{ photo_url: string | null }>(
      `DELETE FROM gym_equipment WHERE id = $1 RETURNING photo_url`,
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Equipo no encontrado' });
      return;
    }
    if (rows[0].photo_url) await deleteMediaFile(rows[0].photo_url);
    await logAudit(req.user!.id, 'equipment_delete', { equipment_id: req.params.id });
    res.json({ success: true });
  })
);

router.post(
  '/:id/retire',
  adminOnly,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = retireSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const reason = parsed.data.reason?.trim() || 'Retirado del inventario activo';
    const current = await query<{ status: string; notes: string | null }>(
      `SELECT status::text, notes FROM gym_equipment WHERE id = $1`,
      [req.params.id]
    );
    if (!current.rows[0]) {
      res.status(404).json({ error: 'Equipo no encontrado' });
      return;
    }
    const noteLine = `[${new Date().toISOString().slice(0, 10)}] Retirado del gym: ${reason}`;
    const mergedNotes = current.rows[0].notes?.trim()
      ? `${current.rows[0].notes.trim()}\n${noteLine}`
      : noteLine;

    await query(
      `UPDATE gym_equipment
       SET status = 'out_of_service'::equipment_status,
           notes = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, mergedNotes]
    );

    await query(
      `INSERT INTO equipment_maintenance_events (
         equipment_id, event_type, previous_status, new_status, description, created_by
       ) VALUES ($1, 'status_change', $2::equipment_status, 'out_of_service'::equipment_status, $3, $4)`,
      [req.params.id, current.rows[0].status, `Retirado del gym. ${reason}`, req.user!.id]
    );

    await logAudit(req.user!.id, 'equipment_retire', {
      equipment_id: req.params.id,
      reason,
    });

    const detail = await query(`${equipmentSelect} WHERE ge.id = $1`, [req.params.id]);
    res.json(mapEquipmentRow(detail.rows[0]));
  })
);

router.post(
  '/:id/events',
  staffRead,
  asyncHandler(async (req: AuthRequest, res) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }
    const user = req.user!;
    const isAdmin = user.role === 'admin';
    const data = parsed.data;
    const eventType = data.event_type ?? 'report';

    if (!isAdmin && eventType !== 'report') {
      res.status(403).json({ error: 'Solo administración puede registrar este tipo de evento' });
      return;
    }

    const current = await query<{ status: string }>(
      `SELECT status::text FROM gym_equipment WHERE id = $1`,
      [req.params.id]
    );
    if (!current.rows[0]) {
      res.status(404).json({ error: 'Equipo no encontrado' });
      return;
    }

    let newStatus = data.new_status ?? null;
    if (!isAdmin && eventType === 'report') {
      newStatus = 'maintenance';
    }

    const { rows } = await query(
      `INSERT INTO equipment_maintenance_events (
         equipment_id, event_type, previous_status, new_status, description,
         vendor_id, cost_usd, performed_at, created_by
       ) VALUES ($1, $2::equipment_event_type, $3::equipment_status, $4::equipment_status, $5, $6, $7, COALESCE($8::timestamptz, NOW()), $9)
       RETURNING *`,
      [
        req.params.id,
        eventType,
        current.rows[0].status,
        newStatus,
        data.description,
        isAdmin ? (data.vendor_id ?? null) : null,
        isAdmin ? (data.cost_usd ?? null) : null,
        data.performed_at ?? null,
        user.id,
      ]
    );

    if (newStatus && newStatus !== current.rows[0].status) {
      await query(
        `UPDATE gym_equipment SET status = $2::equipment_status, updated_at = NOW() WHERE id = $1`,
        [req.params.id, newStatus]
      );
    } else {
      await query(`UPDATE gym_equipment SET updated_at = NOW() WHERE id = $1`, [req.params.id]);
    }

    res.status(201).json(rows[0]);
  })
);

router.post(
  '/:id/photo',
  adminOnly,
  uploadRateLimiter,
  avatarUpload.single('photo'),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Archivo de imagen requerido' });
      return;
    }
    const { rows } = await query<{ photo_url: string | null }>(
      `SELECT photo_url FROM gym_equipment WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Equipo no encontrado' });
      return;
    }

    const photoUrl = isMediaStorageRemote()
      ? await uploadMediaFile('equipment', req.file, `equipment/${req.params.id}`)
      : await localAvatarPathFromUpload(req.file);

    if (rows[0].photo_url) await deleteMediaFile(rows[0].photo_url);

    await query(`UPDATE gym_equipment SET photo_url = $2, updated_at = NOW() WHERE id = $1`, [
      req.params.id,
      photoUrl,
    ]);
    res.json({ photo_url: photoUrl });
  })
);

export default router;
