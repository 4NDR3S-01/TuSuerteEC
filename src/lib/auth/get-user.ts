import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { prisma } from '../db';
import { can, canAccessAdmin, canAccessStaff, canAccessDashboard, getRedirectPath, type Permission } from './roles';

export type User = {
  id: string;
  email: string;
  role: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  cityId?: number;
  parishId?: number;
  address: string;
  mustChangePassword: boolean;
};

export class AuthorizationError extends Error {
  constructor(message = 'No tienes permiso para realizar esta acción.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Usuario autenticado leído siempre desde la base de datos (no desde el token),
 * para que un cambio de rol, una suspensión o un cambio de contraseña surtan efecto de inmediato.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return null;
    }

    const account = await prisma.users.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!account?.profile || account.suspended_at) {
      return null;
    }

    // Sesión emitida antes de un cambio de contraseña/rol/suspensión: ya no es válida
    if ((session.user.sessionVersion ?? 0) !== account.session_version) {
      return null;
    }

    const profile = account.profile;

    return {
      id: account.id,
      email: account.email,
      role: profile.role,
      fullName: profile.full_name,
      idNumber: profile.id_number,
      phoneNumber: profile.phone_number,
      cityId: profile.city_id ?? undefined,
      parishId: profile.parish_id ?? undefined,
      address: profile.address,
      mustChangePassword: account.must_change_password,
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError('Tu sesión expiró. Inicia sesión nuevamente.');
  }
  return user;
}

export async function requireRole(role: 'admin' | 'staff' | 'participant'): Promise<User> {
  const user = await requireAuth();

  const roleChecks = {
    admin: canAccessAdmin,
    staff: canAccessStaff,
    participant: canAccessDashboard,
  };

  if (!roleChecks[role](user.role)) {
    throw new AuthorizationError(`Acceso denegado. Se requiere rol: ${role}`);
  }

  return user;
}

/** Verifica un permiso de la matriz en `roles.ts` (para acciones de servidor) */
export async function requirePermission(permission: Permission): Promise<User> {
  const user = await requireAuth();
  if (!can(user.role, permission)) {
    throw new AuthorizationError();
  }
  return user;
}

/**
 * Igual que `requirePermission`, pero para páginas: redirige en lugar de lanzar un error
 * (sin sesión → login; sin permiso → el panel que le corresponde a su rol).
 */
export async function requirePagePermission(permission: Permission, currentPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(currentPath ? `/iniciar-sesion?redirectTo=${encodeURIComponent(currentPath)}` : '/iniciar-sesion');
  }
  if (!can(user.role, permission)) {
    redirect(getRedirectPath(user.role));
  }
  return user;
}

/** Usuario autenticado para páginas del área de participante */
export async function requirePageUser(currentPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(currentPath ? `/iniciar-sesion?redirectTo=${encodeURIComponent(currentPath)}` : '/iniciar-sesion');
  }
  return user;
}
