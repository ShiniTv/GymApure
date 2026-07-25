import { query } from '../db/index.ts';
import { createUserNotification } from './notifications/service.ts';

interface UpcomingAppointment {
  id: number;
  trainer_id: number;
  member_id: number;
  member_name: string;
  starts_at: string;
}

export async function runTrainerAppointmentReminders(): Promise<{
  scanned: number;
  sent: number;
}> {
  const { rows } = await query<UpcomingAppointment>(
    `SELECT a.id, a.trainer_id, a.member_id, member.full_name AS member_name, a.starts_at::text
     FROM trainer_appointments a
     JOIN users member ON member.id = a.member_id
     JOIN users trainer ON trainer.id = a.trainer_id
     WHERE a.status = 'scheduled'
       AND a.starts_at > NOW()
       AND a.starts_at <= NOW() + INTERVAL '24 hours'
       AND trainer.role = 'trainer'
       AND trainer.status = 'active'
       AND EXISTS (
         SELECT 1 FROM trainer_member_assignments tma
         WHERE tma.trainer_id = a.trainer_id AND tma.member_id = a.member_id
         UNION
         SELECT 1 FROM user_routines ur
         JOIN routines r ON r.id = ur.routine_id
         WHERE ur.user_id = a.member_id AND r.trainer_id = a.trainer_id
       )
     ORDER BY a.starts_at ASC
     LIMIT 100`
  );

  let sent = 0;
  for (const appointment of rows) {
    const startsAt = new Date(appointment.starts_at);
    const when = startsAt.toLocaleString('es-VE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const created = await createUserNotification({
      userId: appointment.trainer_id,
      type: 'appointment_reminder',
      title: 'Sesión 1:1 próxima',
      body: `Sesión con ${appointment.member_name} el ${when}`,
      href: `/members/${appointment.member_id}/routines?tab=agenda`,
      severity: 'info',
      dedupeKey: `appointment-reminder:${appointment.id}:${appointment.starts_at}`,
      metadata: {
        appointment_id: appointment.id,
        member_id: appointment.member_id,
        starts_at: appointment.starts_at,
      },
    });
    if (created) sent++;
  }

  return { scanned: rows.length, sent };
}
