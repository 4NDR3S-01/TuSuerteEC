export type UserRole = 'participant' | 'staff' | 'admin';

export function hasRole(userRole: string | null, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    participant: 1,
    staff: 2,
    admin: 3,
  };
  
  return roleHierarchy[userRole as UserRole] >= roleHierarchy[requiredRole];
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
  if (hasRole(userRole, 'participant')) return '/dashboard';
  return '/iniciar-sesion';
}
