export type UserRole = 'participant' | 'staff' | 'admin';

export const USER_ROLES: readonly UserRole[] = ['participant', 'staff', 'admin'];

/**
 * Matriz de permisos. Es la única fuente de verdad: el servidor la consulta en cada acción
 * y la interfaz solo la usa para decidir qué mostrar.
 */
export const PERMISSIONS = {
  // Participante
  'raffles.participate': ['participant', 'staff', 'admin'],
  // Operación (staff)
  'staff_panel.access': ['staff', 'admin'],
  'payments.review': ['staff', 'admin'],
  'winners.manage': ['staff', 'admin'],
  'live_events.manage': ['staff', 'admin'],
  'raffles.view_all': ['staff', 'admin'],
  // Administración
  'admin_panel.access': ['admin'],
  'raffles.manage': ['admin'],
  'raffles.draw': ['admin'],
  'plans.manage': ['admin'],
  'payment_methods.manage': ['admin'],
  'users.manage': ['admin'],
  'discounts.manage': ['admin'],
  'settings.manage': ['admin'],
  'reports.view': ['admin'],
  'audit.view': ['admin'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export function can(userRole: string | null | undefined, permission: Permission): boolean {
  return Boolean(userRole) && (PERMISSIONS[permission] as readonly string[]).includes(userRole as string);
}

export function hasRole(userRole: string | null, requiredRole: UserRole): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    participant: 1,
    staff: 2,
    admin: 3,
  };

  return (roleHierarchy[userRole as UserRole] ?? 0) >= roleHierarchy[requiredRole];
}

export function canAccessAdmin(userRole: string | null): boolean {
  return hasRole(userRole, 'admin');
}

export function canAccessStaff(userRole: string | null): boolean {
  return hasRole(userRole, 'staff');
}

export function canAccessDashboard(userRole: string | null): boolean {
  return hasRole(userRole, 'participant');
}

export function getRedirectPath(userRole: string | null): string {
  if (hasRole(userRole, 'admin')) return '/administrador';
  if (hasRole(userRole, 'staff')) return '/staff';
  if (hasRole(userRole, 'participant')) return '/app';
  return '/iniciar-sesion';
}

/** Acepta solo rutas internas para evitar redirecciones abiertas (`//sitio.com`, `/\sitio.com`) */
export function safeInternalPath(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined;
  return value;
}
