export type UserRole = 'admin' | 'trainer' | 'member' | 'receptionist';

export const ALL_ROLES: UserRole[] = ['admin', 'trainer', 'member', 'receptionist'];

export const STAFF_ROLES: UserRole[] = ['admin', 'trainer', 'receptionist'];

/** Admin + receptionist — shared file/proof access, legacy compat. */
export const RECEPTION_STAFF: UserRole[] = ['admin', 'receptionist'];

/** Reception desk operations only (check-in, walk-in, counter). */
export const RECEPTION_ONLY: UserRole[] = ['receptionist'];

export const ADMIN_OVERSIGHT_ROLES: UserRole[] = ['admin'];
export const TRAINER_OPERATIONAL_ROLES: UserRole[] = ['trainer'];
export const RECEPTION_OPERATIONAL_ROLES: UserRole[] = ['receptionist'];
export const MEMBER_ROLES: UserRole[] = ['member'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  trainer: 'Entrenador',
  member: 'Cliente',
  receptionist: 'Recepcionista',
};

export const PORTAL_TITLES: Record<UserRole, string> = {
  admin: 'Panel administrativo',
  trainer: 'Portal entrenador',
  member: 'Mi entrenamiento',
  receptionist: 'Mostrador',
};

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}

export function canOperateRoutines(role: UserRole | string): boolean {
  return role === 'trainer';
}

export function canOperateExercises(role: UserRole | string): boolean {
  return role === 'trainer';
}

export function canOperateReception(role: UserRole | string): boolean {
  return role === 'receptionist';
}

export function canViewExerciseLibrary(role: UserRole | string): boolean {
  return role === 'trainer' || role === 'member';
}

/** Ruta principal tras login según rol. */
export function getDefaultRouteForRole(role: UserRole | string): string {
  if (role === 'receptionist') return '/reception';
  return '/';
}
