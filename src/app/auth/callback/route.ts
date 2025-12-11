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

  // Manejar errores
  if (error) {
    const errorMessage = errorDescription 
      ? decodeURIComponent(errorDescription.replaceAll('+', ' '))
      : 'Error al procesar la autenticación';
    
    if (type === 'recovery') {
      const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
      resetUrl.searchParams.set('error', encodeURIComponent(errorMessage));
      return NextResponse.redirect(resetUrl);
    }
    
    if (type === 'email_change') {
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      confirmUrl.searchParams.set('error', encodeURIComponent(errorMessage));
      return NextResponse.redirect(confirmUrl);
    }
    
    return NextResponse.redirect(
      new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Si hay código, intentar procesarlo en el servidor
  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        new URL('/iniciar-sesion?error=Error de configuración', requestUrl.origin)
      );
    }

    try {
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
              // Ignorar errores de escritura de cookies
            }
          },
        },
      });

      // Intentar intercambiar el código por una sesión
      // Esto funciona para códigos PKCE (OAuth, signup, etc.)
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeError && exchangeData?.session) {
        // Éxito: sesión establecida
        if (type === 'recovery') {
          return NextResponse.redirect(new URL('/restablecer-clave', requestUrl.origin));
        }
        if (type === 'email_change') {
          return NextResponse.redirect(new URL('/confirmar-cambio-correo', requestUrl.origin));
        }
        if (type === 'signup') {
          return NextResponse.redirect(new URL('/confirmar-registro?confirmed=true', requestUrl.origin));
        }
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }

      // Si falla (puede ser un token UUID de recovery), pasar al cliente
      // El cliente manejará el token directamente con la API de Supabase
      if (type === 'recovery') {
        const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
        resetUrl.searchParams.set('code', code);
        return NextResponse.redirect(resetUrl);
      }
      
      if (type === 'email_change') {
        const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
        confirmUrl.searchParams.set('code', code);
        return NextResponse.redirect(confirmUrl);
      }

      // Para otros tipos, si falla, redirigir con error
      if (exchangeError) {
        return NextResponse.redirect(
          new URL(`/iniciar-sesion?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        );
      }
    } catch (error) {
      // Si hay excepción, pasar el código al cliente como fallback
      if (type === 'recovery') {
        const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
        resetUrl.searchParams.set('code', code);
        return NextResponse.redirect(resetUrl);
      }
      
      if (type === 'email_change') {
        const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
        confirmUrl.searchParams.set('code', code);
        return NextResponse.redirect(confirmUrl);
      }
    }
  }

  // Si no hay código ni error, redirigir a login
  return NextResponse.redirect(new URL('/iniciar-sesion', requestUrl.origin));
}
