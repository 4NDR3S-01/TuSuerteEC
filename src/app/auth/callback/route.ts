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

  // Si hay un código, procesarlo en el servidor para establecer la sesión
  if (code) {
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

    if (type === 'recovery') {
      if (!exchangeError && exchangeData?.session) {
        // Sesión establecida correctamente - redirigir a restablecer-clave
        const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
        console.log('[AUTH CALLBACK] Recovery exitoso - sesión establecida, redirigiendo');
        return NextResponse.redirect(resetUrl);
      } else {
        // Error al procesar - redirigir con token para que el componente lo intente
        const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
        if (code) {
          resetUrl.searchParams.set('token', code);
        }
        console.log('[AUTH CALLBACK] Recovery con error - redirigiendo con token para reintento');
        return NextResponse.redirect(resetUrl);
      }
    }
    
    if (type === 'email_change') {
      if (!exchangeError && exchangeData?.session) {
        // Sesión establecida - obtener información del usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
          if (user.new_email) {
            confirmUrl.searchParams.set('pending', 'true');
            confirmUrl.searchParams.set('oldEmail', user.email);
            confirmUrl.searchParams.set('newEmail', user.new_email);
          } else {
            confirmUrl.searchParams.set('completed', 'true');
            confirmUrl.searchParams.set('newEmail', user.email);
          }
          console.log('[AUTH CALLBACK] Email change exitoso - redirigiendo con datos');
          return NextResponse.redirect(confirmUrl);
        }
      }
      // Error o sin usuario - redirigir con token
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      if (code) {
        confirmUrl.searchParams.set('token', code);
      }
      console.log('[AUTH CALLBACK] Email change con error - redirigiendo con token');
      return NextResponse.redirect(confirmUrl);
    }
    
    // Para otros tipos (signup, etc.), procesar código y redirigir
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
