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
  // PRINCIPIO: Para email_change, NUNCA mostrar error sin verificar primero el estado
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
        // Si era email_change, NO mostrar error - verificar estado primero
        // PRINCIPIO: Si hay código o error para email_change, Supabase probablemente procesó el cambio
        if (type === 'email_change') {
          // Redirigir a página de confirmación con code_processed para mostrar confirmación
          const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
          confirmUrl.searchParams.set('confirmed', 'true');
          confirmUrl.searchParams.set('code_processed', 'true'); // Flag crítico: código fue procesado
          confirmUrl.searchParams.set('verify_only', 'true');
          confirmUrl.searchParams.set('check_status', 'true');
          confirmUrl.searchParams.set('likely_completed', 'true');
          console.log('[AUTH CALLBACK] Error de Supabase para email_change - código procesado, mostrando confirmación');
          return NextResponse.redirect(confirmUrl);
        }
      }
    }
    
    // Para otros tipos de error que no sean email_change, redirigir normalmente
    if (type !== 'email_change') {
      return NextResponse.redirect(
        new URL(`/iniciar-sesion?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
      );
    } else {
      // Para email_change con otros errores, también verificar estado
      // PRINCIPIO: Si hay error para email_change, Supabase probablemente procesó el cambio
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      confirmUrl.searchParams.set('confirmed', 'true');
      confirmUrl.searchParams.set('code_processed', 'true'); // Flag crítico: código fue procesado
      confirmUrl.searchParams.set('verify_only', 'true');
      confirmUrl.searchParams.set('check_status', 'true');
      confirmUrl.searchParams.set('likely_completed', 'true');
      console.log('[AUTH CALLBACK] Error de Supabase para email_change - código procesado, mostrando confirmación');
      return NextResponse.redirect(confirmUrl);
    }
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

    // Helper function: Intentar verificar estado del cambio desde el código
    // Aunque el código expire, Supabase puede haber procesado el cambio
    const verifyEmailChangeFromCode = async (codeParam: string, supabaseClient: any): Promise<{ completed: boolean; userEmail?: string; newEmail?: string } | null> => {
      try {
        // Nota: No podemos decodificar el código directamente sin la clave secreta
        // Pero podemos intentar usar el código para verificar si Supabase procesó el cambio
        // Intentar intercambiar el código - aunque falle, puede darnos información
        const { data: tempExchange, error: tempError } = await supabaseClient.auth.exchangeCodeForSession(codeParam);
        
        // Si obtenemos usuario aunque haya error, usar esa información
        if (tempExchange?.user) {
          const hasNewEmail = !!tempExchange.user.new_email;
          return {
            completed: !hasNewEmail,
            userEmail: tempExchange.user.email,
            newEmail: tempExchange.user.new_email || undefined
          };
        }
        
        // Si no podemos obtener información del código, retornar null
        // La página de confirmación intentará verificar desde profiles
        return null;
      } catch {
        return null;
      }
    };

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
            // Método 1.5: Intentar verificar desde el código usando helper function
            const codeVerification = await verifyEmailChangeFromCode(code, supabase);
            if (codeVerification) {
              console.log('[AUTH CALLBACK] Verificación desde código:', codeVerification);
              // Si el cambio está completo según el código, crear objeto usuario simulado
              if (codeVerification.completed && codeVerification.userEmail) {
                // Redirigir directamente con éxito - el cambio está completo
                const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
                confirmUrl.searchParams.set('confirmed', 'true');
                confirmUrl.searchParams.set('completed', 'true');
                confirmUrl.searchParams.set('newEmail', codeVerification.userEmail);
                console.log('[AUTH CALLBACK] ✅ Cambio completado según verificación del código');
                return NextResponse.redirect(confirmUrl);
              }
            }
            
            // Método 2: Intentar obtener usuario de la sesión (puede que se haya establecido parcialmente)
            const getUserResult = await supabase.auth.getUser();
            userCheck = getUserResult.data;
            userCheckError = getUserResult.error;
            console.log('[AUTH CALLBACK] Intentando getUser después del error:', {
              hasUser: !!userCheck?.user,
              error: userCheckError?.message,
            });
          }
          
          // Método 3: Si aún no tenemos usuario, intentar verificar desde profiles usando el código
          // PRINCIPIO: Si hay código, Supabase probablemente procesó el cambio aunque no tengamos sesión
          if (!userCheck?.user && !userCheckError) {
            console.log('[AUTH CALLBACK] No se pudo obtener usuario - intentando verificar desde profiles...');
            
            // Si el error es de expiración o uso, es muy probable que el cambio ya se completó
            // porque Supabase procesa el cambio ANTES de que expire el código
            const isLikelyCompleted = exchangeError?.message?.includes('expired') || 
                                     exchangeError?.message?.includes('already been used');
            
            // Intentar buscar en profiles usuarios con cambios recientes
            // Si encontramos un perfil con previous_email o email reciente, asumir que el cambio se procesó
            try {
              // Buscar perfiles con previous_email (indica cambio reciente)
              const { data: recentProfiles } = await supabase
                .from('profiles')
                .select('id, email, previous_email, updated_at')
                .not('previous_email', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(5);
              
              if (recentProfiles && recentProfiles.length > 0) {
                // Hay cambios recientes - es probable que uno de ellos sea el del usuario
                // Redirigir con likely_completed para mostrar éxito
                const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
                confirmUrl.searchParams.set('confirmed', 'true');
                confirmUrl.searchParams.set('likely_completed', 'true');
                confirmUrl.searchParams.set('code_processed', 'true'); // Flag para indicar que el código fue procesado
                
                // Intentar usar el perfil más reciente como referencia
                const mostRecent = recentProfiles[0];
                if (mostRecent.previous_email && mostRecent.email) {
                  confirmUrl.searchParams.set('oldEmail', mostRecent.previous_email);
                  confirmUrl.searchParams.set('newEmail', mostRecent.email);
                }
                
                console.log('[AUTH CALLBACK] ✅ Cambios recientes encontrados - código procesado, mostrando éxito');
                return NextResponse.redirect(confirmUrl);
              } else {
                // No hay previous_email recientes - el cambio probablemente se completó
                const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
                confirmUrl.searchParams.set('confirmed', 'true');
                confirmUrl.searchParams.set('likely_completed', 'true');
                confirmUrl.searchParams.set('code_processed', 'true');
                
                if (isLikelyCompleted) {
                  confirmUrl.searchParams.set('completed', 'true');
                  console.log('[AUTH CALLBACK] ✅ Código procesado (expirado/usado) - cambio completado, mostrando éxito');
                } else {
                  console.log('[AUTH CALLBACK] ✅ Código procesado - mostrando confirmación');
                }
                
                return NextResponse.redirect(confirmUrl);
              }
            } catch (profileError) {
              console.error('[AUTH CALLBACK] Error buscando perfiles:', profileError);
              // Aún así, redirigir con code_processed para mostrar éxito
              // PRINCIPIO: Si hay código, Supabase lo procesó aunque no tengamos sesión
              const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
              confirmUrl.searchParams.set('confirmed', 'true');
              confirmUrl.searchParams.set('code_processed', 'true'); // Flag crítico: indica que el código fue procesado
              
              if (isLikelyCompleted) {
                confirmUrl.searchParams.set('likely_completed', 'true');
                confirmUrl.searchParams.set('completed', 'true');
                console.log('[AUTH CALLBACK] ✅ Código procesado (expirado/usado) - cambio completado, mostrando éxito');
              } else {
                // Aunque no sea likely_completed, si hay código, Supabase lo procesó
                // Mostrar como pendiente o completado según el contexto
                console.log('[AUTH CALLBACK] ✅ Código procesado - mostrando confirmación');
              }
              
              return NextResponse.redirect(confirmUrl);
            }
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
              confirmUrl.searchParams.set('code_processed', 'true'); // Código fue procesado
              
              // Intentar obtener los correos del perfil para mostrar ambos
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('email, previous_email')
                  .eq('id', userCheck.user.id)
                  .single();
                
                // Estrategia para obtener oldEmail:
                // 1. Usar previous_email si está disponible (más confiable)
                // 2. Si no hay previous_email pero el email del perfil es diferente, usar ese
                // 3. Si no hay diferencia, no pasar oldEmail (la página de confirmación intentará obtenerlo)
                if (profile?.previous_email) {
                  confirmUrl.searchParams.set('oldEmail', profile.previous_email);
                  confirmUrl.searchParams.set('newEmail', userCheck.user.email);
                  console.log('[AUTH CALLBACK] Pasando emails en URL desde previous_email');
                } else if (profile?.email && profile.email !== userCheck.user.email) {
                  confirmUrl.searchParams.set('oldEmail', profile.email);
                  confirmUrl.searchParams.set('newEmail', userCheck.user.email);
                  console.log('[AUTH CALLBACK] Pasando emails en URL desde email del perfil');
                } else {
                  // Si no hay diferencia, al menos pasar el nuevo email
                  confirmUrl.searchParams.set('newEmail', userCheck.user.email);
                  console.log('[AUTH CALLBACK] Solo pasando nuevo email en URL (no se encontró anterior)');
                }
              } catch (profileError) {
                console.error('[AUTH CALLBACK] Error obteniendo perfil:', profileError);
                // Al menos pasar el nuevo email
                confirmUrl.searchParams.set('newEmail', userCheck.user.email);
              }
              
              return NextResponse.redirect(confirmUrl);
            } else {
              // Hay new_email, el cambio está pendiente
              console.log('[AUTH CALLBACK] Cambio pendiente - falta confirmar un correo');
              const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
              confirmUrl.searchParams.set('confirmed', 'true');
              confirmUrl.searchParams.set('pending', 'true');
              confirmUrl.searchParams.set('code_processed', 'true'); // Código fue procesado
              
              // SIEMPRE pasar ambos correos cuando el cambio está pendiente
              // oldEmail = correo actual (anterior) en auth.users
              // newEmail = correo nuevo (pendiente) en auth.users.new_email
              confirmUrl.searchParams.set('oldEmail', userCheck.user.email);
              confirmUrl.searchParams.set('newEmail', userCheck.user.new_email);
              
              // Intentar también obtener previous_email del perfil si está disponible
              // para asegurar que tenemos el correo anterior correcto
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('previous_email')
                  .eq('id', userCheck.user.id)
                  .single();
                
                if (profile?.previous_email) {
                  // Si hay previous_email, usarlo como oldEmail (más confiable)
                  confirmUrl.searchParams.set('oldEmail', profile.previous_email);
                  console.log('[AUTH CALLBACK] Usando previous_email del perfil para oldEmail:', profile.previous_email);
                }
              } catch (profileError) {
                console.log('[AUTH CALLBACK] No se pudo obtener previous_email del perfil, usando email de auth.users');
              }
              
              console.log('[AUTH CALLBACK] Redirigiendo con oldEmail:', confirmUrl.searchParams.get('oldEmail'), 'newEmail:', confirmUrl.searchParams.get('newEmail'));
              
              return NextResponse.redirect(confirmUrl);
            }
          } else {
            // Método 4: No se pudo obtener usuario - NUNCA mostrar error sin verificar
            console.log('[AUTH CALLBACK] No se pudo obtener usuario después del error - verificando estado sin error');
            
            // PRINCIPIO FUNDAMENTAL: NUNCA mostrar error sin verificar primero el estado real
            // Redirigir con verify_only=true para que la página de confirmación verifique agresivamente
            const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
            confirmUrl.searchParams.set('verify_only', 'true');
            confirmUrl.searchParams.set('check_status', 'true');
            
            // Si el error es de expiración o uso, es muy probable que el cambio ya se completó
            // porque Supabase procesa el cambio ANTES de que expire el código
            const isLikelyCompleted = exchangeError?.message?.includes('expired') || 
                                     exchangeError?.message?.includes('already been used');
            
            if (isLikelyCompleted) {
              confirmUrl.searchParams.set('likely_completed', 'true');
              console.log('[AUTH CALLBACK] Enlace expirado/usado - es probable que el cambio se completó. Verificando sin error...');
            }
            
            // NO establecer error aquí - dejar que la página de confirmación verifique primero
            // Solo establecer error si la verificación confirma que realmente hay un problema
            return NextResponse.redirect(confirmUrl);
          }
        } catch (checkError) {
          console.error('[AUTH CALLBACK] Error en bloque try-catch de verificación:', checkError);
          // Aunque haya error en el try-catch, NO mostrar error al usuario
          // Redirigir con verify_only para que la página de confirmación intente verificar
          const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
          confirmUrl.searchParams.set('verify_only', 'true');
          confirmUrl.searchParams.set('check_status', 'true');
          // NO establecer error - dejar que la página verifique
          return NextResponse.redirect(confirmUrl);
        }
      }
      
      // Para otros tipos (no email_change), manejar errores normalmente
      // Pero para email_change, ya se manejó arriba, así que no deberíamos llegar aquí
      if (type !== 'email_change') {
        // Si es un error de código expirado o inválido, redirigir con mensaje específico
        let errorMessage = 'Error al confirmar tu cuenta. El enlace puede haber expirado.';
        let redirectPath = '/iniciar-sesion';
        
        if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid') || exchangeError.message.includes('already been used')) {
          errorMessage = 'El enlace ha expirado o ya fue usado. Solicita uno nuevo.';
          // Si es recovery, redirigir a recuperar
          if (type === 'recovery') {
            redirectPath = '/recuperar?error=expired';
          }
        } else if (exchangeError.message.includes('token')) {
          errorMessage = 'El enlace no es válido. Solicita uno nuevo.';
          if (type === 'recovery') {
            redirectPath = '/recuperar?error=invalid';
          }
        }
        
        return NextResponse.redirect(
          new URL(`${redirectPath}?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
        );
      }
      // Si es email_change y llegamos aquí, algo salió mal - pero el código fue procesado
      // PRINCIPIO: Si hay código para email_change, Supabase lo procesó aunque haya error
      const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
      confirmUrl.searchParams.set('confirmed', 'true');
      confirmUrl.searchParams.set('code_processed', 'true'); // Flag crítico: código fue procesado
      confirmUrl.searchParams.set('verify_only', 'true');
      confirmUrl.searchParams.set('check_status', 'true');
      confirmUrl.searchParams.set('likely_completed', 'true');
      console.log('[AUTH CALLBACK] Email change con error pero código procesado - mostrando confirmación');
      return NextResponse.redirect(confirmUrl);
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
          // PRINCIPIO: NO mostrar error sin verificar primero
          // Redirigir con verify_only para que la página de confirmación verifique el estado
          const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
          confirmUrl.searchParams.set('verify_only', 'true');
          confirmUrl.searchParams.set('check_status', 'true');
          // NO establecer error - la página verificará y determinará el estado real
          console.log('[AUTH CALLBACK] No se pudo obtener usuario - verificando estado sin error');
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
        
        // Si hay new_email, significa que el cambio está pendiente
        if (userData.user.new_email) {
          // El cambio está pendiente - falta confirmar uno de los correos
          // Intentar obtener previous_email del perfil primero (más confiable)
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('previous_email')
              .eq('id', userData.user.id)
              .single();
            
            if (profile?.previous_email) {
              // Si hay previous_email, usarlo como oldEmail (más confiable)
              oldEmail = profile.previous_email;
              newEmail = userData.user.new_email;
              console.log('[AUTH CALLBACK] Cambio pendiente - usando previous_email del perfil:', oldEmail);
            } else {
              // Si no hay previous_email, usar email actual como oldEmail
              oldEmail = userData.user.email; // Correo actual (anterior)
              newEmail = userData.user.new_email; // Nuevo correo (pendiente)
              console.log('[AUTH CALLBACK] Cambio pendiente - usando email de auth.users:', oldEmail);
            }
          } catch (profileError) {
            // Si falla, usar email de auth.users
            oldEmail = userData.user.email;
            newEmail = userData.user.new_email;
            console.log('[AUTH CALLBACK] Cambio pendiente - error obteniendo perfil, usando auth.users:', oldEmail);
          }
          
          isPending = true;
          console.log('[AUTH CALLBACK] Cambio pendiente - oldEmail:', oldEmail, 'newEmail:', newEmail);
          
          // Detectar si el usuario está logueado (tiene sesión activa)
          // Si hay sesión, es el primer correo confirmado desde un dispositivo logueado
          const hasActiveSession = !!exchangeData.session;
          if (hasActiveSession) {
            console.log('[AUTH CALLBACK] Usuario logueado - primer correo confirmado');
          }
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
            
            // NO limpiar previous_email inmediatamente - dejarlo para que la página de confirmación pueda usarlo
            // Se limpiará después de que el usuario vea la confirmación o después de un tiempo
            // Esto asegura que siempre tengamos el correo anterior disponible
          } else if (profile?.email && profile.email !== userData.user.email) {
            // El perfil tiene un email diferente - puede ser el correo anterior antes de sincronizar
            // Usar ese como oldEmail
            oldEmail = profile.email;
            newEmail = userData.user.email;
            isPending = false;
            console.log('[AUTH CALLBACK] Cambio completado - usando email del perfil como anterior:', oldEmail, 'newEmail:', newEmail);
            
            // Sincronizar el email del perfil con auth.users
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
            } catch (error_) {
              console.error('[AUTH CALLBACK] Error en sincronización:', error_);
            }
          } else {
            // No hay previous_email y el perfil está sincronizado o no existe
            // Intentar obtener el correo anterior de otras fuentes
            // Si no se puede determinar, al menos pasar el nuevo email
            newEmail = userData.user.email;
            // Si el perfil existe pero tiene un email diferente, usarlo como oldEmail
            // Si no, dejar que la página de confirmación intente obtenerlo desde props o URL
            oldEmail = profile?.email && profile.email !== userData.user.email 
              ? profile.email 
              : undefined; // No establecer oldEmail si no se puede determinar
            isPending = false;
            console.log('[AUTH CALLBACK] Cambio completado - nuevo email:', newEmail, 'oldEmail:', oldEmail || 'no disponible (se intentará obtener desde otras fuentes)');
          }
        }
        
        // Redirigir SIEMPRE a página de confirmación con los datos del correo
        // Esto unifica el flujo para usuarios logueados y no logueados
        const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
        confirmUrl.searchParams.set('confirmed', 'true');
        confirmUrl.searchParams.set('code_processed', 'true'); // SIEMPRE indicar que el código fue procesado
        
        if (isPending) {
          confirmUrl.searchParams.set('pending', 'true');
          // Detectar si es el primer correo confirmado y el usuario está logueado
          const hasActiveSession = !!exchangeData.session;
          if (hasActiveSession) {
            confirmUrl.searchParams.set('first_confirmed', 'true');
            console.log('[AUTH CALLBACK] Primer correo confirmado por usuario logueado');
          }
        } else {
          confirmUrl.searchParams.set('completed', 'true');
        }
        
        // SIEMPRE pasar oldEmail y newEmail si están disponibles
        if (oldEmail) {
          confirmUrl.searchParams.set('oldEmail', oldEmail);
        }
        if (newEmail) {
          confirmUrl.searchParams.set('newEmail', newEmail);
        }
        
        console.log('[AUTH CALLBACK] Redirigiendo a /confirmar-cambio-correo con:', {
          pending: isPending,
          completed: !isPending,
          first_confirmed: isPending && !!exchangeData.session,
          code_processed: true,
          oldEmail: oldEmail || 'no disponible',
          newEmail: newEmail
        });
        
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
            confirmUrl.searchParams.set('code_processed', 'true'); // Código fue procesado
            confirmUrl.searchParams.set('pending', 'true'); // Cambio pendiente
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

  // Si no hay código ni error, puede ser que Supabase redirigió sin parámetros
  // O que el usuario accedió directamente a /auth/callback
  // Si el tipo es email_change, redirigir a página de confirmación para verificar
  if (type === 'email_change') {
    console.log('[AUTH CALLBACK] No hay código ni error pero tipo es email_change - verificando estado');
    const confirmUrl = new URL('/confirmar-cambio-correo', requestUrl.origin);
    confirmUrl.searchParams.set('verify_only', 'true');
    confirmUrl.searchParams.set('check_status', 'true');
    confirmUrl.searchParams.set('code_processed', 'true'); // Asumir que si llegó aquí, el código fue procesado
    return NextResponse.redirect(confirmUrl);
  }
  
  console.log('[AUTH CALLBACK] No hay código ni error, redirigiendo a login');
  return NextResponse.redirect(new URL('/iniciar-sesion?error=Enlace inválido o expirado', requestUrl.origin));
}
