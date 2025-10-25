import { updateSession } from '../lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/iniciar-sesion', '/registro', '/completar-perfil', '/ayuda', '/sobre-nosotros', '/recuperar', '/restablecer-clave'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + '/')
  );
  
  // Si es ruta pública, solo actualizar las cookies sin validar usuario
  if (isPublicRoute) {
    const { response } = await updateSession(request);
    return response;
  }

  try {
    const { supabase, response } = await updateSession(request);
    
    // Obtener usuario autenticado (solo UNA vez)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Si hay error o no hay usuario autenticado, redirigir a login
    if (error || !user) {
      const redirectUrl = new URL('/iniciar-sesion', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Obtener rol del usuario - primero intenta desde user_metadata (más rápido)
    let userRole: string = user.user_metadata?.role || 'participant';
    
    // Solo consultar la base de datos si el rol no está en metadata
    if (!user.user_metadata?.role) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role) {
          userRole = profile.role;
        }
      } catch {
        // Si falla, usar el rol por defecto
        userRole = 'participant';
      }
    }
    
    // Proteger rutas por rol
    const { pathname } = request.nextUrl;
    
    if (pathname.startsWith('/administrador')) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    if (pathname.startsWith('/staff')) {
      if (!['admin', 'staff'].includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    if (pathname.startsWith('/dashboard')) {
      if (!['admin', 'staff', 'participant'].includes(userRole)) {
        return NextResponse.redirect(new URL('/iniciar-sesion', request.url));
      }
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/iniciar-sesion', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    String.raw`/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`,
  ],
};
