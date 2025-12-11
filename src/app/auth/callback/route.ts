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
  console.log('[AUTH CALLBACK] Parรกmetros recibidos:', {
    code: code ? 'presente' : 'ausente',
    type,
    error,
    hasNext: !!next,
    url: requestUrl.toString(),
  });

  // Si hay un error, redirigir apropiadamente segรบn el tipo de error
  if (error) {
    const errorCode = requestUrl.searchParams.get('error_code');
    let errorMessage = errorDescription 
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : 'Error al procesar la autenticaciรณn';
    
    // Si es un error de OTP expirado, puede ser reset password o cambio de email
    if (errorCode === 'otp_expired' || error === 'access_denied') {
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        errorMessage = 'El enlace ha expirado o ya fue usado. Solicita uno nuevo.';
        // Si el tipo era recovery, redirigir a recuperar
        if (type === 'recovery') {
          return NextResponse.redirect(
            new URL(`/recuperar?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
          );
        }
        // Si era email_change, redirigir a settings
        if (type === 'email_change') {
          return NextResponse.redirect(
            new URL(`/iniciar-sesion?error=${encodeURIComponent('El enlace de cambio de correo ha expirado. Solicita uno nuevo desde la configuraciรณn.')}`, requestUrl.origin)
          );
        }
      }
    }
    
    return NextResponse.redirect(
      new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  // Si hay un cรณdigo, intercambiarlo por una sesiรณn
  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        new URL('/iniciar-sesion?error=Error de configuraciรณn', requestUrl.origin)
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
      console.error('[AUTH CALLBACK] Error exchanging code for session:', {
        message: exchangeError.message,
        status: exchangeError.status,
        code: code.substring(0, 20) + '...',
        type,
      });
      
      // Para email_change, SIEMPRE verificar si el cambio ya se completó antes de mostrar error
      if (type === 'email_change') {
        try {
          console.log('[AUTH CALLBACK] Verificando estado del cambio de email después del error');
          
          // Intentar múltiples métodos para obtener el usuario cuando no hay sesión
          let userCheck: any = null;
          let userCheckError: any = null;
          
          // Método 1: Intentar obtener del exchangeData aunque haya error (puede tener datos parciales)
          if (exchangeData?.user) {
            userCheck = { user: exchangeData.user };
            console.log('[AUTH CALLBACK] Usuario obtenido de exchangeData a pesar del error');
          } else {
            // Método 2: Intentar obtener usuario de la sesión (puede que se haya establecido parcialmente)
            const getUserResult = await supabase.auth.getUser();
            userCheck = getUserResult.data;
            userCheckError = getUserResult.error;
            console.log('[AUTH CALLBACK] Intentando getUser después del error:', {
              hasUser: !!userCheck?.user,
              error: userCheckError?.message,
            });
          }
          
          // Método 3: Si aún no tenemos usuario, intentar verificar desde el perfil usando el token
          // Esto es útil cuando el usuario no está logueado pero el cambio ya se completó
          if (!userCheck?.user && !userCheckError) {
            console.log('[AUTH CALLBACK] Intentando verificar desde profiles usando el código del token');
            // El código puede contener información del usuario, pero no podemos extraerlo directamente
            // En su lugar, redirigimos a la página de confirmación que verificará el estado
            const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
            confirmUrl.searchParams.set('error', encodeURIComponent('El enlace puede haber expirado o ya fue usado. Verificando si el cambio se completó...'));
            confirmUrl.searchParams.set('check_status', 'true');
            return NextResponse.redirect(confirmUrl);
          }
          
          if (!userCheckError && userCheck?.user) {
            console.log('[AUTH CALLBACK] Resultado de verificación:', {
              hasUser: !!userCheck?.user,
              email: userCheck?.user?.email,
              new_email: userCheck?.user?.new_email,
            });
            
            // Si no hay new_email, el cambio ya se completó (ambos correos confirmados)
            if (!userCheck.user.new_email) {
              console.log('[AUTH CALLBACK] ✅ Cambio de email ya completado, redirigiendo a confirmación exitosa');
              
              const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
              confirmUrl.searchParams.set('confirmed', 'true');
              confirmUrl.searchParams.set('completed', 'true');
              
              // Intentar obtener los correos del perfil para mostrar ambos
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('email, previous_email')
                  .eq('id', userCheck.user.id)
                  .single();
                
                // Usar previous_email si está disponible
                if (profile?.previous_email) {
                  confirmUrl.searchParams.set('oldEmail', profile.previous_email);
                  confirmUrl.searchParams.set('newEmail', userCheck.user.email);
                } else if (profile?.email && profile.email !== userCheck.user.email) {
                  confirmUrl.searchParams.set('oldEmail', profile.email);
                  confirmUrl.searchParams.set('newEmail', userCheck.user.email);
                } else {
                  // Si no hay diferencia, usar el email actual como nuevo
                  confirmUrl.searchParams.set('newEmail', userCheck.user.email);
                }
              } catch (profileError) {
                console.error('[AUTH CALLBACK] Error obteniendo perfil:', profileError);
                // Continuar sin los correos específicos
                confirmUrl.searchParams.set('newEmail', userCheck.user.email);
              }
              
              return NextResponse.redirect(confirmUrl);
            } else {
              // Hay new_email, el cambio está pendiente
              console.log('[AUTH CALLBACK] Cambio pendiente - falta confirmar un correo');
              const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
              confirmUrl.searchParams.set('confirmed', 'true');
              confirmUrl.searchParams.set('pending', 'true');
              confirmUrl.searchParams.set('oldEmail', userCheck.user.email);
              confirmUrl.searchParams.set('newEmail', userCheck.user.new_email);
              
              // Mensaje más claro según el tipo de error
              let pendingMessage = 'El cambio de correo está pendiente. Debes confirmar ambos correos (anterior y nuevo) para completarlo.';
              if (exchangeError?.message?.includes('expired') || exchangeError?.message?.includes('already been used')) {
                pendingMessage = 'El enlace puede haber expirado o ya fue usado, pero el cambio aún está pendiente. Revisa ambos correos (anterior y nuevo) para completar la confirmación.';
              } else if (exchangeError?.message?.includes('invalid') || exchangeError?.message?.includes('token')) {
                pendingMessage = 'El enlace no es válido, pero el cambio aún está pendiente. Revisa ambos correos para completar la confirmación.';
              }
              
              confirmUrl.searchParams.set('error', encodeURIComponent(pendingMessage));
              return NextResponse.redirect(confirmUrl);
            }
          } else {
            console.log('[AUTH CALLBACK] No se pudo obtener usuario después del error');
            // Intentar verificar desde la base de datos usando el código del token
            // Aunque no podamos obtener el usuario directamente, podemos intentar verificar
            // si el cambio se completó consultando la tabla profiles
            // Nota: No podemos extraer el user_id del código directamente, pero podemos
            // redirigir a la página de confirmación que intentará verificar desde el perfil
            const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
            
            // Determinar el tipo de error para mostrar un mensaje más específico
            let errorMessage = 'No se pudo verificar el estado del cambio.';
            if (exchangeError?.message?.includes('expired') || exchangeError?.message?.includes('already been used')) {
              errorMessage = 'El enlace ha expirado o ya fue usado. Verificando si el cambio se completó...';
            } else if (exchangeError?.message?.includes('invalid') || exchangeError?.message?.includes('token')) {
              errorMessage = 'El enlace no es válido. Verificando si el cambio se completó...';
            } else {
              errorMessage = 'No se pudo verificar el estado. El cambio puede haberse completado. Verificando...';
            }
            
            confirmUrl.searchParams.set('error', encodeURIComponent(errorMessage));
            confirmUrl.searchParams.set('check_status', 'true');
            return NextResponse.redirect(confirmUrl);
          }
        } catch (checkError) {
          console.error('[AUTH CALLBACK] Error verificando estado del cambio:', checkError);
          // Redirigir a página de confirmación que verificará el estado
          const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
          confirmUrl.searchParams.set('error', encodeURIComponent('Error al verificar el estado. El enlace puede haber expirado. Verificando si el cambio se completó...'));
          confirmUrl.searchParams.set('check_status', 'true');
          return NextResponse.redirect(confirmUrl);
        }
      }
      
      // Si es un error de cรณdigo expirado o invรกlido, redirigir con mensaje especรญfico
      let errorMessage = 'Error al confirmar tu cuenta. El enlace puede haber expirado.';
      let redirectPath = '/iniciar-sesion';
      
      if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid') || exchangeError.message.includes('already been used')) {
        errorMessage = 'El enlace ha expirado o ya fue usado. Solicita uno nuevo.';
        // Si es recovery, redirigir a recuperar
        if (type === 'recovery') {
          redirectPath = '/recuperar?error=expired';
        }
        // Si es email_change, redirigir a confirmar-cambio-correo con mensaje de error
        if (type === 'email_change') {
          redirectPath = '/confirmar-cambio-correo?error=' + encodeURIComponent('El enlace ha expirado. Verificando si el cambio se completó...');
        }
      } else if (exchangeError.message.includes('token')) {
        errorMessage = 'El enlace no es vรกlido. Solicita uno nuevo.';
        if (type === 'recovery') {
          redirectPath = '/recuperar?error=invalid';
        }
        // Si es email_change, redirigir a confirmar-cambio-correo con mensaje de error
        if (type === 'email_change') {
          redirectPath = '/confirmar-cambio-correo?error=' + encodeURIComponent('El enlace no es vรกlido. Verificando si el cambio se completó...');
        }
      }
      
      return NextResponse.redirect(
        new URL(`${redirectPath}?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
      );
    }

    // Verificar que la sesiรณn se estableciรณ correctamente
    // Para email_change, puede que no haya sesión persistente si se confirma desde dispositivo no logueado
    // Pero el exchangeCodeForSession debería haber establecido una sesión temporal
    if (!exchangeData.session && type !== 'email_change') {
      return NextResponse.redirect(
        new URL('/iniciar-sesion?error=No se pudo establecer la sesiรณn. Intenta nuevamente.', requestUrl.origin)
      );
    }
    
    // Para email_change sin sesión, aún podemos procesar la confirmación
    if (!exchangeData.session && type === 'email_change') {
      console.log('[AUTH CALLBACK] Email change sin sesión persistente, pero continuando con el proceso');
    }

    // Redirigir segรบn el tipo de acciรณn
    switch (type) {
      case 'email_change':
        // Cambio de email confirmado - obtener informaciรณn del usuario
        // Si hay sesión, usar getUser, si no, intentar obtener del exchangeData
        let userData: any = null;
        let userError: any = null;
        
        // Primero intentar obtener del exchangeData (puede tener el usuario incluso sin sesión persistente)
        if (exchangeData.user) {
          userData = { user: exchangeData.user };
          console.log('[AUTH CALLBACK] Usando usuario de exchangeData');
        } else if (exchangeData.session) {
          // Si hay sesión, obtener el usuario
          const result = await supabase.auth.getUser();
          userData = result.data;
          userError = result.error;
          console.log('[AUTH CALLBACK] Usando usuario de getUser con sesión');
        } else {
          // Último intento: obtener usuario directamente (puede funcionar con sesión temporal)
          const result = await supabase.auth.getUser();
          userData = result.data;
          userError = result.error;
          console.log('[AUTH CALLBACK] Intentando obtener usuario sin sesión persistente');
        }
        
        if (userError || !userData?.user) {
          console.error('[AUTH CALLBACK] Error obteniendo usuario en email_change:', userError);
          // Si no se pudo obtener el usuario, redirigir a confirmación con mensaje genérico
          // en lugar de a login, para que el usuario vea que el proceso está en curso
          const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
          confirmUrl.searchParams.set('confirmed', 'true');
          confirmUrl.searchParams.set('pending', 'true');
          confirmUrl.searchParams.set('error', 'No se pudo obtener la información completa. El cambio puede estar en proceso. Revisa ambos correos.');
          return NextResponse.redirect(confirmUrl);
        }

        console.log('[AUTH CALLBACK] Email change - User data:', {
          email: userData.user.email,
          new_email: userData.user.new_email,
          email_confirmed_at: userData.user.email_confirmed_at,
        });

        // Cuando se confirma el cambio de email, Supabase puede tener diferentes estados:
        // 1. Si se confirma el correo ANTERIOR primero (no logueado):
        //    - user.email = correo anterior
        //    - user.new_email = nuevo correo (pendiente)
        // 2. Si se confirma el correo NUEVO primero (logueado):
        //    - user.email = correo anterior
        //    - user.new_email = nuevo correo (pendiente)
        // 3. Si ambos estรกn confirmados:
        //    - user.email = nuevo correo
        //    - user.new_email = null
        
        let oldEmail = userData.user.email;
        let newEmail = userData.user.new_email || userData.user.email;
        let isPending = false;
        
        // Si hay new_email, significa que el cambio estรก pendiente
        if (userData.user.new_email) {
          // El cambio estรก pendiente - falta confirmar uno de los correos
          oldEmail = userData.user.email; // Correo actual (anterior)
          newEmail = userData.user.new_email; // Nuevo correo (pendiente)
          isPending = true;
          
          console.log('[AUTH CALLBACK] Cambio pendiente - oldEmail:', oldEmail, 'newEmail:', newEmail);
        } else {
          // No hay new_email - el cambio está completo (ambos correos confirmados)
          // El trigger sync_email_to_profiles_trigger debería haber sincronizado automáticamente
          // pero verificamos y sincronizamos manualmente si es necesario
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, previous_email')
            .eq('id', userData.user.id)
            .single();
          
          // Obtener el correo anterior desde previous_email si está disponible
          if (profile?.previous_email) {
            oldEmail = profile.previous_email;
            newEmail = userData.user.email;
            isPending = false;
            console.log('[AUTH CALLBACK] Cambio completado - usando previous_email:', oldEmail, 'newEmail:', newEmail);
            
            // Limpiar previous_email después de usarlo
            await supabase
              .from('profiles')
              .update({ previous_email: null })
              .eq('id', userData.user.id);
          } else if (profile?.email && profile.email !== userData.user.email) {
            // Si hay desincronización, sincronizar manualmente
            console.log('[AUTH CALLBACK] Detectada desincronización, sincronizando email...');
            console.log('[AUTH CALLBACK] auth.users.email:', userData.user.email);
            console.log('[AUTH CALLBACK] profiles.email:', profile.email);
            
            // Sincronizar usando la función RPC
            try {
              const { error: syncError } = await supabase.rpc('sync_user_email_to_profile', {
                user_id_param: userData.user.id,
              });
              
              if (syncError) {
                console.error('[AUTH CALLBACK] Error sincronizando email:', syncError);
                // Intentar actualización directa como fallback
                await supabase
                  .from('profiles')
                  .update({ email: userData.user.email, updated_at: new Date().toISOString() })
                  .eq('id', userData.user.id);
              } else {
                console.log('[AUTH CALLBACK] Email sincronizado exitosamente');
              }
            } catch (syncErr) {
              console.error('[AUTH CALLBACK] Error en sincronización:', syncErr);
            }
            
            oldEmail = profile.email; // Email anterior del perfil
            newEmail = userData.user.email; // Email actual (nuevo) de auth.users
            isPending = false;
            console.log('[AUTH CALLBACK] Cambio completado - oldEmail:', oldEmail, 'newEmail:', newEmail);
          } else {
            // Si no hay diferencia y no hay previous_email, usar el email actual como nuevo
            // Esto puede pasar si el cambio se completó antes de guardar previous_email
            newEmail = userData.user.email;
            oldEmail = userData.user.email; // Fallback: usar el mismo email
            isPending = false;
            console.log('[AUTH CALLBACK] Cambio completado - usando email actual (sin previous_email):', newEmail);
          }
        }
        
        // Redirigir a pรกgina de confirmaciรณn con los datos del correo
        const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
        confirmUrl.searchParams.set('confirmed', 'true');
        if (isPending) {
          confirmUrl.searchParams.set('pending', 'true');
        } else {
          confirmUrl.searchParams.set('completed', 'true');
        }
        if (oldEmail) confirmUrl.searchParams.set('oldEmail', oldEmail);
        if (newEmail) confirmUrl.searchParams.set('newEmail', newEmail);
        
        return NextResponse.redirect(confirmUrl);
      
      case 'recovery':
        // Reset de contraseรฑa
        return NextResponse.redirect(
          new URL('/restablecer-clave?token=valid', requestUrl.origin)
        );
      
      case 'signup':
        // Confirmaciรณn de registro - redirigir a pรกgina de confirmaciรณn
        return NextResponse.redirect(
          new URL('/confirmar-registro?confirmed=true', requestUrl.origin)
        );
      
      default:
        // Si no hay tipo especificado pero hay cรณdigo, intentar determinar el tipo desde la sesiรณn
        console.log('[AUTH CALLBACK] Tipo no especificado, intentando determinar desde la sesiรณn');
        const { data: defaultUserData, error: defaultUserError } = await supabase.auth.getUser();
        
        if (defaultUserError) {
          console.error('[AUTH CALLBACK] Error obteniendo usuario:', defaultUserError);
          return NextResponse.redirect(new URL('/iniciar-sesion?error=Error al obtener informaciรณn del usuario', requestUrl.origin));
        }
        
        if (defaultUserData?.user) {
          // Si el usuario tiene new_email, es un cambio de email
          if (defaultUserData.user.new_email) {
            console.log('[AUTH CALLBACK] Detectado cambio de email desde new_email');
            // Reutilizar la lรณgica de email_change
            let oldEmail = defaultUserData.user.email;
            let newEmail = defaultUserData.user.new_email;
            
            const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
            confirmUrl.searchParams.set('confirmed', 'true');
            if (oldEmail) confirmUrl.searchParams.set('oldEmail', oldEmail);
            if (newEmail) confirmUrl.searchParams.set('newEmail', newEmail);
            
            return NextResponse.redirect(confirmUrl);
          }
          
          // Verificar si el usuario tiene email confirmado (puede ser confirmaciรณn de registro)
          if (defaultUserData.user.email_confirmed_at) {
            console.log('[AUTH CALLBACK] Usuario con email confirmado, puede ser confirmaciรณn de registro');
            return NextResponse.redirect(new URL('/confirmar-registro?confirmed=true', requestUrl.origin));
          }
          
          // Si no hay new_email pero el usuario estรก autenticado, puede ser confirmaciรณn de registro
          console.log('[AUTH CALLBACK] Usuario autenticado sin new_email, redirigiendo a confirmaciรณn de registro');
          return NextResponse.redirect(new URL('/confirmar-registro?confirmed=true', requestUrl.origin));
        }
        
        // Si no hay usuario, puede ser que el cรณdigo no estableciรณ la sesiรณn correctamente
        // O puede ser un enlace de reset password sin tipo
        console.log('[AUTH CALLBACK] No se pudo determinar el tipo, redirigiendo a login');
        return NextResponse.redirect(new URL('/iniciar-sesion?error=No se pudo determinar el tipo de confirmaciรณn', requestUrl.origin));
    }
  }

  // Si no hay cรณdigo ni error, puede ser que Supabase redirigiรณ sin parรกmetros
  // O que el usuario accediรณ directamente a /auth/callback
  console.log('[AUTH CALLBACK] No hay cรณdigo ni error, redirigiendo a login');
  return NextResponse.redirect(new URL('/iniciar-sesion?error=Enlace invรกlido o expirado', requestUrl.origin));
}
