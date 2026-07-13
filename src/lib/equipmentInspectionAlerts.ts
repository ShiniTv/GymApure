import { query } from '../db/index.ts';
import { insertNotificationsBulk, getUnreadCounts } from './notifications/repository.ts';
import { getEquipmentInspectionAlertDays } from './equipmentSettings.ts';
import { equipmentDisplayName } from './equipment/constants.ts';
import { mapWithConcurrency } from './runInBatches.ts';
import { emitToUser } from './wsServer.ts';

const NOTIFY_CONCURRENCY = 5;

export async function syncEquipmentInspectionAlerts(): Promise<number> {
  const alertDays = await getEquipmentInspectionAlertDays();

  const { rows: dueRows } = await query<{
    id: number;
    custom_name: string | null;
    catalog_name: string | null;
    next_inspection_at: string;
  }>(
    `SELECT ge.id, ge.custom_name, ec.name AS catalog_name, ge.next_inspection_at::text
     FROM gym_equipment ge
     LEFT JOIN equipment_catalog ec ON ec.id = ge.catalog_id
     WHERE ge.next_inspection_at IS NOT NULL
       AND ge.next_inspection_at <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
     ORDER BY ge.next_inspection_at ASC
     LIMIT 50`,
    [alertDays]
  );

  if (dueRows.length === 0) return 0;

  const { rows: admins } = await query<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
  );

  if (admins.length === 0) return 0;

  const notifications = admins.flatMap((admin) =>
    dueRows.map((item) => {
      const name = equipmentDisplayName(item);
      return {
        userId: admin.id,
        type: 'equipment_inspection',
        title: 'Inspección de equipo pendiente',
        body: `${name} requiere revisión antes del ${item.next_inspection_at}`,
        href: `/equipment?detail=${item.id}`,
        severity: 'warning' as const,
        dedupeKey: `equipment-inspection:${item.id}:${item.next_inspection_at}`,
        metadata: { equipment_id: item.id },
      };
    })
  );

  const inserted = await insertNotificationsBulk(notifications);
  if (inserted.length === 0) return 0;

  const adminIds = [...new Set(inserted.map((r) => r.user_id))];
  const unreadCounts = await getUnreadCounts(adminIds);

  await mapWithConcurrency(
    adminIds,
    (userId) => {
      emitToUser(userId, 'notification:new', {
        unreadCount: unreadCounts.get(userId) ?? 0,
      });
      return Promise.resolve();
    },
    NOTIFY_CONCURRENCY
  );

  return inserted.length;
}

export async function getEquipmentStatsSummary(): Promise<{
  operational: number;
  limited: number;
  maintenance: number;
  outOfService: number;
  inspectionsDueThisWeek: number;
}> {
  const [statusRows, inspectionRows] = await Promise.all([
    query<{ status: string; count: string }>(
      `SELECT status::text, COUNT(*)::text AS count FROM gym_equipment GROUP BY status`
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM gym_equipment
       WHERE next_inspection_at IS NOT NULL
         AND next_inspection_at <= CURRENT_DATE + INTERVAL '7 days'`
    ),
  ]);

  const counts = Object.fromEntries(statusRows.rows.map((r) => [r.status, Number(r.count)]));
  return {
    operational: counts.operational ?? 0,
    limited: counts.limited ?? 0,
    maintenance: counts.maintenance ?? 0,
    outOfService: counts.out_of_service ?? 0,
    inspectionsDueThisWeek: Number(inspectionRows.rows[0]?.count ?? 0),
  };
}
