/** Supabase project refs — prod vs dev (leídas de variables de entorno con fallbacks de proyecto). */
export const PROD_REF = process.env.PROD_SUPABASE_REF || process.env.SUPABASE_PROD_REF || 'ffjwvlcwhyskddqqojnp';
export const DEV_REF = process.env.DEV_SUPABASE_REF || process.env.SUPABASE_DEV_REF || 'sqjyxmbtgmiorckigrrg';

/** Nombres en Supabase Dashboard. */
export const PROD_DISPLAY_NAME = 'GymApure – Producción';
export const DEV_DISPLAY_NAME = 'GymApure – Desarrollo';

export const PROD_DASHBOARD_URL = PROD_REF
  ? `https://supabase.com/dashboard/project/${PROD_REF}`
  : 'https://supabase.com/dashboard';
export const DEV_DASHBOARD_URL = DEV_REF
  ? `https://supabase.com/dashboard/project/${DEV_REF}`
  : 'https://supabase.com/dashboard';
