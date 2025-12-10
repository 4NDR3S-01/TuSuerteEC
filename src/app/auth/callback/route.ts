import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/app';
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Si hay un error, redirigir a login con mensaje de error
  if (error) {
    const errorMessage = errorDescription 
      ? decodeURIComponent(errorDescription)
      : 'Error al procesar la autenticación';
    
    return NextResponse.redirect(
      new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Si hay un código, intercambiarlo por una sesión
  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        new URL('/iniciar-sesion?error=Error de configuración', requestUrl.origin)
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookies().set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookies().delete({ name, ...options });
        },
      },
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/iniciar-sesion?error=${encodeURIComponent('Error al confirmar tu cuenta. El enlace puede haber expirado.')}`, requestUrl.origin)
      );
    }

    // Redirigir según el tipo de acción
    switch (type) {
      case 'email_change':
        // Cambio de email confirmado
        return NextResponse.redirect(
          new URL('/app/settings?email_changed=true', requestUrl.origin)
        );
      
      case 'recovery':
        // Reset de contraseña
        return NextResponse.redirect(
          new URL('/restablecer-clave?token=valid', requestUrl.origin)
        );
      
      case 'signup':
        // Confirmación de registro
        return NextResponse.redirect(
          new URL('/iniciar-sesion?confirmed=true', requestUrl.origin)
        );
      
      default:
        // Por defecto, redirigir según el parámetro next
        return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Si no hay código ni error, redirigir a login
  return NextResponse.redirect(new URL('/iniciar-sesion', requestUrl.origin));
}
