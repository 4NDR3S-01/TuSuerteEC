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

  // Si hay un error, redirigir a la página correspondiente con el error
  if (error) {
    const errorMessage = errorDescription 
      ? decodeURIComponent(errorDescription.replaceAll('+', ' '))
      : 'Error al procesar la autenticación';
    
    if (type === 'recovery') {
      const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
      resetUrl.searchParams.set('error', encodeURIComponent(errorMessage));
      console.log('[AUTH CALLBACK] Error en recovery - redirigiendo con error');
      return NextResponse.redirect(resetUrl);
    }
    
    if (type === 'email_change') {
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      confirmUrl.searchParams.set('error', encodeURIComponent(errorMessage));
      console.log('[AUTH CALLBACK] Error en email_change - redirigiendo con error');
      return NextResponse.redirect(confirmUrl);
    }
    
    // Para otros tipos, redirigir a login con error
    return NextResponse.redirect(
      new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Si hay un código, intentar procesarlo en el servidor primero
  // Si falla por PKCE, pasarlo al cliente como fallback
  if (code) {
    if (type === 'recovery' || type === 'email_change') {
      // Intentar procesar en el servidor primero
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
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
                  // Ignorar errores de escritura
                }
              },
            },
          });

          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!exchangeError && exchangeData?.session) {
            // Éxito: sesión establecida en el servidor
            if (type === 'recovery') {
              console.log('[AUTH CALLBACK] Recovery - sesión establecida en servidor');
              return NextResponse.redirect(new URL('/restablecer-clave', requestUrl.origin));
            }
            if (type === 'email_change') {
              console.log('[AUTH CALLBACK] Email change - sesión establecida en servidor');
              return NextResponse.redirect(new URL('/confirmar-cambio-correo', requestUrl.origin));
            }
          } else if (exchangeError) {
            // Error (probablemente PKCE): pasar al cliente como fallback
            console.log('[AUTH CALLBACK] Error en servidor, pasando código al cliente:', exchangeError.message);
          }
        } catch (error) {
          console.log('[AUTH CALLBACK] Excepción en servidor, pasando código al cliente:', error);
        }
      }

      // Fallback: pasar el código al cliente para procesarlo ahí
      if (type === 'recovery') {
        const resetUrl = new URL('/restablecer-clave', requestUrl.origin);
        resetUrl.searchParams.set('token', code);
        console.log('[AUTH CALLBACK] Recovery - redirigiendo con token para procesar en cliente');
        return NextResponse.redirect(resetUrl);
      }
      
      if (type === 'email_change') {
        const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
        confirmUrl.searchParams.set('token', code);
        console.log('[AUTH CALLBACK] Email change - redirigiendo con token para procesar en cliente');
        return NextResponse.redirect(confirmUrl);
      }
    }
    
    // Para signup y otros tipos, procesar código en servidor (estos flujos tienen PKCE)
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

    // Procesar el código en el servidor para establecer la sesión
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[AUTH CALLBACK] Error exchanging code:', exchangeError.message);
      return NextResponse.redirect(
        new URL(`/iniciar-sesion?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    if (exchangeData.session) {
      // Para signup, redirigir a confirmar-registro
      if (type === 'signup') {
        return NextResponse.redirect(new URL('/confirmar-registro?confirmed=true', requestUrl.origin));
      }
      
      // Redirigir según el next o a la app
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Si no hay código ni error, redirigir a login
  return NextResponse.redirect(new URL('/iniciar-sesion', requestUrl.origin));
}
