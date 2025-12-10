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
    url: requestUrl.toString(),
  });

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
      console.error('Error exchanging code for session:', exchangeError);
      // Si es un error de código expirado o inválido, redirigir con mensaje específico
      const errorMessage = exchangeError.message.includes('expired') || exchangeError.message.includes('invalid')
        ? 'El enlace ha expirado o ya fue usado. Solicita uno nuevo.'
        : 'Error al confirmar tu cuenta. El enlace puede haber expirado.';
      return NextResponse.redirect(
        new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
      );
    }

    // Verificar que la sesión se estableció correctamente
    if (!exchangeData.session) {
      return NextResponse.redirect(
        new URL('/iniciar-sesion?error=No se pudo establecer la sesión. Intenta nuevamente.', requestUrl.origin)
      );
    }

    // Redirigir según el tipo de acción
    switch (type) {
      case 'email_change':
        // Cambio de email confirmado - obtener información del usuario
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData?.user) {
          return NextResponse.redirect(
            new URL('/iniciar-sesion?error=No se pudo obtener la información del usuario.', requestUrl.origin)
          );
        }

        // Cuando se confirma el cambio de email, Supabase puede tener:
        // - user.email: el correo anterior (antes del cambio)
        // - user.new_email: el nuevo correo (si aún no se completa)
        // O después de confirmar, user.email ya es el nuevo correo
        // Necesitamos obtener el correo anterior de otra forma
        
        // Intentar obtener el correo anterior del perfil si está disponible
        let oldEmail = userData.user.email;
        let newEmail = userData.user.new_email || userData.user.email;
        
        // Si hay new_email, significa que el cambio está pendiente
        // El email actual es el anterior, y new_email es el nuevo
        if (userData.user.new_email) {
          oldEmail = userData.user.email;
          newEmail = userData.user.new_email;
        } else {
          // Si no hay new_email, el cambio ya se completó
          // Intentar obtener el correo anterior del perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userData.user.id)
            .single();
          
          // Si tenemos el perfil, usar ese email como referencia
          // Pero en este punto, el email ya debería estar actualizado
          // Por seguridad, usar el email actual como nuevo
          newEmail = userData.user.email;
        }
        
        // Redirigir a página de confirmación con los datos del correo
        const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
        confirmUrl.searchParams.set('confirmed', 'true');
        if (oldEmail) confirmUrl.searchParams.set('oldEmail', oldEmail);
        if (newEmail) confirmUrl.searchParams.set('newEmail', newEmail);
        
        return NextResponse.redirect(confirmUrl);
      
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
        // Si no hay tipo especificado pero hay código, intentar determinar el tipo desde la sesión
        console.log('[AUTH CALLBACK] Tipo no especificado, intentando determinar desde la sesión');
        const { data: defaultUserData, error: defaultUserError } = await supabase.auth.getUser();
        
        if (defaultUserError) {
          console.error('[AUTH CALLBACK] Error obteniendo usuario:', defaultUserError);
          return NextResponse.redirect(new URL('/iniciar-sesion?error=Error al obtener información del usuario', requestUrl.origin));
        }
        
        if (defaultUserData?.user) {
          // Si el usuario tiene new_email, es un cambio de email
          if (defaultUserData.user.new_email) {
            console.log('[AUTH CALLBACK] Detectado cambio de email desde new_email');
            // Reutilizar la lógica de email_change
            let oldEmail = defaultUserData.user.email;
            let newEmail = defaultUserData.user.new_email;
            
            const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
            confirmUrl.searchParams.set('confirmed', 'true');
            if (oldEmail) confirmUrl.searchParams.set('oldEmail', oldEmail);
            if (newEmail) confirmUrl.searchParams.set('newEmail', newEmail);
            
            return NextResponse.redirect(confirmUrl);
          }
          
          // Verificar si el usuario tiene email confirmado (puede ser confirmación de registro)
          if (defaultUserData.user.email_confirmed_at) {
            console.log('[AUTH CALLBACK] Usuario con email confirmado, puede ser confirmación de registro');
            return NextResponse.redirect(new URL('/iniciar-sesion?confirmed=true', requestUrl.origin));
          }
          
          // Si no hay new_email pero el usuario está autenticado, puede ser confirmación de registro
          console.log('[AUTH CALLBACK] Usuario autenticado sin new_email, redirigiendo a login');
          return NextResponse.redirect(new URL('/iniciar-sesion?confirmed=true', requestUrl.origin));
        }
        
        // Si no hay usuario, puede ser que el código no estableció la sesión correctamente
        // O puede ser un enlace de reset password sin tipo
        console.log('[AUTH CALLBACK] No se pudo determinar el tipo, redirigiendo a login');
        return NextResponse.redirect(new URL('/iniciar-sesion?error=No se pudo determinar el tipo de confirmación', requestUrl.origin));
    }
  }

  // Si no hay código ni error, puede ser que Supabase redirigió sin parámetros
  // O que el usuario accedió directamente a /auth/callback
  console.log('[AUTH CALLBACK] No hay código ni error, redirigiendo a login');
  return NextResponse.redirect(new URL('/iniciar-sesion?error=Enlace inválido o expirado', requestUrl.origin));
}
