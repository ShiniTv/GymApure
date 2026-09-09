import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../../db/index.ts';
import { deleteMediaFile } from '../mediaStorage.ts';
import { invalidateSessionUserCache } from '../sessionUserCache.ts';
import { logAudit } from '../audit.ts';

const UNUSABLE_PASSWORD = () => bcrypt.hashSync(`deleted-${Date.now()}-${Math.random()}`, 12);

export type DeleteAccountResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Self-service account closure: deactivate + anonymize PII.
 * Financial / attendance rows remain for gym ops without identifying fields.
 * Avatar media is best-effort deleted from Storage.
 */
export async function anonymizeAndDeactivateAccount(
  userId: number,
  actorId: number
): Promise<DeleteAccountResult> {
  const { rows } = await query<{
    id: number;
    role: string;
    status: string;
    profile_image: string | null;
    email: string;
  }>(`SELECT id, role, status, profile_image, email FROM users WHERE id = $1`, [userId]);

  const user = rows[0];
  if (!user) {
    return { ok: false, status: 404, error: 'Usuario no encontrado' };
  }
  if (user.status !== 'active') {
    return { ok: false, status: 400, error: 'La cuenta ya está inactiva' };
  }

  if (user.role === 'admin') {
    const { rows: adminCount } = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users WHERE role = 'admin' AND status = 'active'`
    );
    if (Number(adminCount[0]?.c ?? 0) <= 1) {
      return {
        ok: false,
        status: 400,
        error: 'No puedes eliminar la única cuenta de administrador activa',
      };
    }
  }

  const previousImage = user.profile_image;
  const anonEmail = `deleted+${userId}@invalid.local`;
  const anonCedula = `DELETED-${userId}`;
  const passwordHash = UNUSABLE_PASSWORD();

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE users SET
         email = $1,
         password = $2,
         full_name = 'Cuenta eliminada',
         cedula = $3,
         phone = NULL,
         dob = NULL,
         initial_weight = NULL,
         height = NULL,
         goal = NULL,
         profile_image = NULL,
         mfa_secret = NULL,
         mfa_enabled = FALSE,
         status = 'inactive',
         token_version = token_version + 1
       WHERE id = $4`,
      [anonEmail, passwordHash, anonCedula, userId]
    );

    await client.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);

    await client.query(
      `UPDATE member_health_profiles SET
         condition_flags = '{}',
         conditions_notes = NULL,
         limitations_notes = NULL,
         allergies_notes = NULL,
         medications_notes = NULL,
         sex = NULL,
         activity_level = NULL,
         bmr_kcal = NULL,
         tdee_kcal = NULL,
         weight_used_kg = NULL,
         health_consent_at = NULL,
         health_consent_version = NULL,
         health_consent_policy_at = NULL,
         metabolic_computed_at = NULL,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  });

  invalidateSessionUserCache(userId);
  await logAudit(actorId, 'user.delete_account', { target_id: userId, method: 'anonymize' });

  if (previousImage) {
    void deleteMediaFile(previousImage);
  }

  return { ok: true };
}
