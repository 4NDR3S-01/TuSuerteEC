import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth/get-user';

function resolvePathFromRole(role: string | undefined) {
  switch (role) {
    case 'admin':
      return '/administrador';
    case 'staff':
      return '/staff';
    default:
      return '/app';
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ path: '/iniciar-sesion' }, { status: 401 });
    }

    const path = resolvePathFromRole(user.role);
    return NextResponse.json({ path, role: user.role });
  } catch (error) {
    console.error('Error resolving redirect path:', error);
    return NextResponse.json({ path: '/app' }, { status: 500 });
  }
}
