import { updateSession } from '../lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/', '/iniciar-sesion', '/registro', '/completar-perfil'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + '/')
  );
  
  // Si es ruta pública, permitir acceso
  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    const { supabase, response } = await updateSession(request);
    
    // Obtener usuario autenticado
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Si hay error o no hay usuario autenticado, redirigir a login
    if (error || !user) {
      const redirectUrl = new URL('/iniciar-sesion', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Obtener rol del usuario - primero intenta desde la base de datos
    let userRole: string;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      userRole = profile?.role || user.user_metadata?.role || 'participant';
    } catch {
      userRole = user.user_metadata?.role || 'participant';
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
