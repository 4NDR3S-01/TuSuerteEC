import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/app';
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Log para debugging
  console.log('[AUTH CALLBACK] Parámetros recibidos:', {
    code: code ? 'presente' : 'ausente',
    type,
    error,
    hasNext: !!next,
  });

  // Si hay un error, redirigir con el token para que el componente lo procese
  if (error) {
    if (type === 'recovery') {
      const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
      if (code) {
        resetUrl.searchParams.set('token', code);
      }
      console.log('[AUTH CALLBACK] Error en recovery - redirigiendo con token');
      return NextResponse.redirect(resetUrl);
    }
    
    if (type === 'email_change') {
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      if (code) {
        confirmUrl.searchParams.set('token', code);
      }
      console.log('[AUTH CALLBACK] Error en email_change - redirigiendo con token');
      return NextResponse.redirect(confirmUrl);
    }
    
    // Para otros tipos, redirigir a login con error
    const errorMessage = errorDescription 
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : 'Error al procesar la autenticación';
    return NextResponse.redirect(
      new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Si hay un código, redirigir directamente con el token para que el componente lo procese
  // Esto es más simple: el componente usará verifyOtp directamente
  if (code) {
    if (type === 'recovery') {
      const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
      resetUrl.searchParams.set('token', code);
      console.log('[AUTH CALLBACK] Recovery - redirigiendo con token');
      return NextResponse.redirect(resetUrl);
    }
    
    if (type === 'email_change') {
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      confirmUrl.searchParams.set('token', code);
      console.log('[AUTH CALLBACK] Email change - redirigiendo con token');
      return NextResponse.redirect(confirmUrl);
    }
    
    // Para otros tipos (signup, etc.), intentar intercambiar código por sesión
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        new URL('/iniciar-sesion?error=Error de configuración', requestUrl.origin)
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const cookie of cookiesToSet) {
              const anyCookie: any = cookie;
              const name = anyCookie.name;
              const value = anyCookie.value;
              if (!name) continue;
              const opts = anyCookie.options ? { ...anyCookie.options } : { ...anyCookie };
              delete opts.name;
              delete opts.value;
              cookieStore.set({ name, value, ...opts });
            }
          } catch {
            // Ignorar errores de escritura
          }
        },
      },
    });

    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[AUTH CALLBACK] Error exchanging code:', exchangeError.message);
      return NextResponse.redirect(
        new URL(`/iniciar-sesion?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    if (exchangeData.session) {
      // Redirigir según el next o a la app
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Si no hay código ni error, redirigir a login
  return NextResponse.redirect(new URL('/iniciar-sesion', requestUrl.origin));
}
