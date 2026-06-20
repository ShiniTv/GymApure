export type UserRole = 'admin' | 'trainer' | 'member' | 'receptionist';

export const ALL_ROLES: UserRole[] = ['admin', 'trainer', 'member', 'receptionist'];

export const STAFF_ROLES: UserRole[] = ['admin', 'trainer', 'receptionist'];

export const RECEPTION_STAFF: UserRole[] = ['admin', 'receptionist'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  trainer: 'Entrenador',
  member: 'Cliente',
  receptionist: 'Recepcionista',
};

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}
