import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

// Solo estas secciones requieren sesión; cualquier otra ruta es pública (o un 404 real)
const PROTECTED_PREFIXES = ['/app', '/staff', '/administrador', '/sorteo/'];

function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
}

const REFERRAL_PATTERN = /^[A-Za-z0-9]{4,12}$/;

export default auth((request) => {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith('/api') || !isProtectedRoute(pathname)) {
    const response = NextResponse.next();
    // Recordar el código de invitación aunque la persona se registre más tarde
    const ref = searchParams.get('ref');
    if (ref && REFERRAL_PATTERN.test(ref) && !request.auth?.user) {
      response.cookies.set('ref', ref.toUpperCase(), { maxAge: 30 * 24 * 60 * 60, httpOnly: true, sameSite: 'lax', path: '/' });
    }
    return response;
  }

  const user = request.auth?.user;

  // Sin sesión: redirigir a login recordando la ruta solicitada
  if (!user) {
    const redirectUrl = new URL('/iniciar-sesion', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const userRole = user.role || 'participant';

  // Protección por rol (primera barrera; cada página y acción vuelve a verificar en el servidor)
  if (pathname.startsWith('/administrador') || pathname.startsWith('/sorteo/')) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }

  if (pathname.startsWith('/staff')) {
    if (!['admin', 'staff'].includes(userRole)) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - _next/static, _next/image (archivos estáticos)
     * - favicon.ico e imágenes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
