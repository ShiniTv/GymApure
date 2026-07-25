import { query } from '../db/index.ts';
import { createUserNotification } from './notifications/service.ts';

interface UpcomingAppointment {
  id: number;
  trainer_id: number;
  member_id: number;
  member_name: string;
  starts_at: string;
}

interface EndingTrainingBlock {
  id: number;
  trainer_id: number;
  member_id: number;
  member_name: string;
  name: string;
  end_date: string;
}

export async function runTrainerAppointmentReminders(): Promise<{
  scanned: number;
  sent: number;
  blockScanned: number;
  blockSent: number;
}> {
  const [appointments, blocks] = await Promise.all([
    query<UpcomingAppointment>(
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
    ),
    query<EndingTrainingBlock>(
      `SELECT b.id, b.trainer_id, b.member_id, member.full_name AS member_name,
              b.name, b.end_date::text
       FROM member_training_blocks b
       JOIN users member ON member.id = b.member_id
       JOIN users trainer ON trainer.id = b.trainer_id
       WHERE b.status = 'active'
         AND b.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
         AND trainer.role = 'trainer'
         AND trainer.status = 'active'
         AND EXISTS (
           SELECT 1 FROM trainer_member_assignments tma
           WHERE tma.trainer_id = b.trainer_id AND tma.member_id = b.member_id
           UNION
           SELECT 1 FROM user_routines ur
           JOIN routines r ON r.id = ur.routine_id
           WHERE ur.user_id = b.member_id AND r.trainer_id = b.trainer_id
         )
       ORDER BY b.end_date ASC
       LIMIT 100`
    ),
  ]);

  let sent = 0;
  for (const appointment of appointments.rows) {
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

  let blockSent = 0;
  for (const block of blocks.rows) {
    const created = await createUserNotification({
      userId: block.trainer_id,
      type: 'training_block_review',
      title: 'Bloque próximo a revisión',
      body: `${block.name} de ${block.member_name} finaliza el ${block.end_date}`,
      href: `/members/${block.member_id}/routines?tab=bloques`,
      severity: 'info',
      dedupeKey: `training-block-review:${block.id}:${block.end_date}`,
      metadata: {
        training_block_id: block.id,
        member_id: block.member_id,
        end_date: block.end_date,
      },
    });
    if (created) blockSent++;
  }

  return {
    scanned: appointments.rows.length,
    sent,
    blockScanned: blocks.rows.length,
    blockSent,
  };
}
