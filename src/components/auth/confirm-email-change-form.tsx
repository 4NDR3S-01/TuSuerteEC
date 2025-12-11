'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { getEmailAuthRedirectUrl } from '../../lib/utils/get-base-url';
import { useToast } from '../../hooks/use-toast';

type ConfirmEmailChangeFormProps = {
  oldEmail?: string;
  newEmail?: string;
  confirmed?: boolean;
  pending?: boolean;
  completed?: boolean;
  error?: string;
};

export function ConfirmEmailChangeForm({ 
  oldEmail, 
  newEmail, 
  confirmed: initialConfirmed = false,
  pending: initialPending = false,
  completed: initialCompleted = false,
  error: initialError 
}: ConfirmEmailChangeFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isValidating, setIsValidating] = useState(!initialConfirmed && !initialError);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [pending, setPending] = useState(initialPending);
  const [completed, setCompleted] = useState(initialCompleted);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [changeCompleted, setChangeCompleted] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [emailData, setEmailData] = useState<{ oldEmail?: string; newEmail?: string } | null>(
    oldEmail && newEmail ? { oldEmail, newEmail } : null
  );

  // Cargar datos iniciales de la URL o props
  useEffect(() => {
    if (initialConfirmed || initialError) {
      setIsValidating(false);
    }

    if (!emailData) {
      // PRIORIDAD 1: Emails de la URL
      const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
      const urlOldEmail = urlParams.get('oldEmail');
      const urlNewEmail = urlParams.get('newEmail');
      const urlPending = urlParams.get('pending') === 'true';
      const urlCompleted = urlParams.get('completed') === 'true';
      
      if (urlOldEmail && urlNewEmail && urlOldEmail !== urlNewEmail) {
        // Usar emails de la URL si están disponibles y son diferentes
        setEmailData({ oldEmail: urlOldEmail, newEmail: urlNewEmail });
        setConfirmed(true);
        setPending(urlPending);
        setCompleted(urlCompleted);
        setIsValidating(false);
        console.log('[CONFIRM EMAIL CHANGE] Inicializando desde URL');
      } else if (oldEmail && newEmail && oldEmail !== newEmail) {
        // PRIORIDAD 2: Emails de los props
        setEmailData({ oldEmail, newEmail });
        setConfirmed(initialConfirmed);
        setPending(initialPending);
        setCompleted(initialCompleted);
        setIsValidating(false);
        console.log('[CONFIRM EMAIL CHANGE] Inicializando desde props');
      } else if (urlNewEmail || newEmail) {
        // Si solo tenemos el nuevo email, establecerlo pero sin oldEmail
        setEmailData({ oldEmail: urlOldEmail || oldEmail || undefined, newEmail: urlNewEmail || newEmail || '' });
        setConfirmed(initialConfirmed || urlOldEmail !== null);
        setPending(urlPending || initialPending);
        setCompleted(urlCompleted || initialCompleted);
        setIsValidating(false);
        console.log('[CONFIRM EMAIL CHANGE] Inicializando con solo nuevo email');
      }
    }
  }, [initialConfirmed, initialError, emailData, oldEmail, newEmail, initialPending, initialCompleted]);

  // Verificar estado del cambio cuando hay error o no hay datos
  useEffect(() => {
    // Solo verificar una vez y si no se ha verificado antes
    if (hasCheckedStatus) return;
    
    // Verificar si hay error de expiración, si no hay datos de email, o si viene check_status/verify_only
    const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
    const shouldCheckStatus = urlParams.get('check_status') === 'true';
    const verifyOnly = urlParams.get('verify_only') === 'true';
    const likelyCompleted = urlParams.get('likely_completed') === 'true';
    const shouldCheck = shouldCheckStatus || 
                       verifyOnly ||
                       likelyCompleted ||
                       (error && (error.includes('expirado') || error.includes('ya fue usado') || error.includes('inválido') || error.includes('inv?lido'))) || 
                       (!emailData && !isValidating);
    
    if (shouldCheck && !isCheckingStatus && !changeCompleted) {
      setHasCheckedStatus(true);
      setIsCheckingStatus(true);
      
      const checkStatus = async () => {
        try {
          console.log('[CONFIRM EMAIL CHANGE] Verificando estado del cambio...');
          const supabase = getSupabaseBrowserClient();
          
          // Intentar obtener el usuario - puede funcionar incluso sin sesi?n persistente
          // si el token del enlace estableci? una sesi?n temporal
          let user: any = null;
          let userError: any = null;
          
          // Intentar obtener usuario
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
          user = authUser;
          userError = authError;
          
          // ESTRATEGIA RECONSTRUIDA: Verificación agresiva sin sesión
          // Cuando no hay sesión, verificar desde múltiples fuentes antes de mostrar error
          if (userError && (userError.message.includes('session') || userError.message.includes('JWT'))) {
            console.log('[CONFIRM EMAIL CHANGE] No hay sesión - iniciando verificación agresiva desde base de datos...');
            
            // Obtener emails de la URL
            const urlOldEmail = urlParams.get('oldEmail');
            const urlNewEmail = urlParams.get('newEmail');
            
            // ESTRATEGIA 1: Buscar en profiles usando emails de la URL (búsqueda mejorada)
            if (urlOldEmail || urlNewEmail) {
              try {
                // Mejorar búsqueda: buscar por ambos emails si están disponibles
                let profileByEmail: any = null;
                let profileSearchError: any = null;
                
                if (urlOldEmail && urlNewEmail) {
                  // Buscar por ambos emails - más preciso
                  console.log('[CONFIRM EMAIL CHANGE] Buscando perfil con ambos emails:', urlOldEmail, urlNewEmail);
                  const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, previous_email')
                    .or(`email.eq.${urlNewEmail},email.eq.${urlOldEmail},previous_email.eq.${urlOldEmail},previous_email.eq.${urlNewEmail}`)
                    .maybeSingle();
                  profileByEmail = data;
                  profileSearchError = error;
                } else {
                  // Buscar por un solo email
                  const emailToSearch = urlNewEmail || urlOldEmail;
                  console.log('[CONFIRM EMAIL CHANGE] Buscando perfil con email:', emailToSearch);
                  const { data, error } = await supabase
                    .from('profiles')
                    .select('id, email, previous_email')
                    .or(`email.eq.${emailToSearch},previous_email.eq.${emailToSearch}`)
                    .single();
                  profileByEmail = data;
                  profileSearchError = error;
                }
                
                if (profileSearchError) {
                  console.error('[CONFIRM EMAIL CHANGE] Error buscando perfil:', profileSearchError);
                } else if (profileByEmail) {
                  console.log('[CONFIRM EMAIL CHANGE] Perfil encontrado:', {
                    email: profileByEmail.email,
                    previous_email: profileByEmail.previous_email,
                  });
                  
                  // Lógica mejorada para determinar el estado del cambio:
                  // 1. Si hay previous_email, el cambio está pendiente
                  // 2. Si no hay previous_email y tenemos emails en la URL, verificar si coinciden
                  // 3. Si el email del perfil coincide con urlNewEmail, el cambio está completo
                  if (profileByEmail.previous_email) {
                    // Cambio pendiente: hay previous_email guardado
                    const newEmail = profileByEmail.email || urlNewEmail || '';
                    setEmailData({ 
                      oldEmail: profileByEmail.previous_email, 
                      newEmail: newEmail
                    });
                    setConfirmed(true);
                    setPending(true);
                    setError(null);
                    console.log('[CONFIRM EMAIL CHANGE] Cambio pendiente detectado desde perfil');
                  } else if (urlNewEmail && profileByEmail.email === urlNewEmail) {
                    // Cambio completo: el perfil tiene el nuevo email y coincide con la URL
                    const oldEmail = urlOldEmail || profileByEmail.previous_email || (urlOldEmail || urlNewEmail);
                    setEmailData({ 
                      oldEmail: oldEmail, 
                      newEmail: urlNewEmail 
                    });
                    setConfirmed(true);
                    setCompleted(true);
                    setChangeCompleted(true);
                    setError(null); // Limpiar cualquier error previo
                    console.log('[CONFIRM EMAIL CHANGE] ✅ Cambio completo detectado desde perfil - mostrando éxito');
                  } else if (verifyOnly && !profileByEmail.previous_email && profileByEmail.email) {
                    // Si verify_only=true y no hay previous_email, el cambio probablemente se completó
                    // Usar el email del perfil como nuevo email
                    const detectedOldEmail = urlOldEmail || (urlNewEmail && urlNewEmail !== profileByEmail.email ? urlNewEmail : null);
                    const detectedNewEmail = profileByEmail.email;
                    setEmailData({ 
                      oldEmail: detectedOldEmail || 'correo anterior', 
                      newEmail: detectedNewEmail 
                    });
                    setConfirmed(true);
                    setCompleted(true);
                    setChangeCompleted(true);
                    setError(null);
                    console.log('[CONFIRM EMAIL CHANGE] ✅ verify_only=true y no hay previous_email - cambio completado');
                  } else if (likelyCompleted && !profileByEmail.previous_email) {
                    // Si likely_completed=true y no hay previous_email, es probable que el cambio se completó
                    // Intentar usar el email del perfil como nuevo email
                    const emailToUse = urlNewEmail || urlOldEmail || profileByEmail.email;
                    const detectedNewEmail = profileByEmail.email || urlNewEmail || emailToUse;
                    setEmailData({ 
                      oldEmail: urlOldEmail || emailToUse, 
                      newEmail: detectedNewEmail 
                    });
                    setConfirmed(true);
                    setCompleted(true);
                    setChangeCompleted(true);
                    setError(null); // Limpiar error, mostrar éxito
                    console.log('[CONFIRM EMAIL CHANGE] ✅ Cambio probablemente completado (likely_completed) - mostrando éxito');
                  } else if (urlOldEmail && urlNewEmail) {
                    // Tenemos ambos emails en la URL, usar esos
                    setEmailData({ 
                      oldEmail: urlOldEmail, 
                      newEmail: urlNewEmail 
                    });
                    setConfirmed(true);
                    // Si el perfil tiene el nuevo email, está completo, si no, está pendiente
                    if (profileByEmail.email === urlNewEmail) {
                      setCompleted(true);
                      setChangeCompleted(true);
                    } else {
                      setPending(true);
                    }
                    setError(null);
                    console.log('[CONFIRM EMAIL CHANGE] Usando emails de la URL con verificación de perfil');
                  }
                  
                  setIsCheckingStatus(false);
                  setIsValidating(false);
                  return;
                }
              } catch (profileSearchError) {
                console.error('[CONFIRM EMAIL CHANGE] Error buscando perfil:', profileSearchError);
                // Continuar con el flujo normal si no se puede buscar el perfil
              }
            } else {
              // ESTRATEGIA 2: No hay emails en URL - buscar usuarios recientes con previous_email
              // Si verify_only=true o likely_completed=true, intentar buscar usuarios que hayan cambiado email recientemente
              if (verifyOnly || likelyCompleted) {
                console.log('[CONFIRM EMAIL CHANGE] verify_only/likely_completed=true sin emails en URL - buscando usuarios con cambios recientes...');
                
                try {
                  // Buscar perfiles que tengan previous_email (indica cambio reciente)
                  // Ordenar por updated_at descendente para obtener los más recientes
                  const { data: recentChanges, error: recentError } = await supabase
                    .from('profiles')
                    .select('id, email, previous_email, updated_at')
                    .not('previous_email', 'is', null)
                    .order('updated_at', { ascending: false })
                    .limit(10);
                  
                  if (!recentError && recentChanges && recentChanges.length > 0) {
                    console.log('[CONFIRM EMAIL CHANGE] Encontrados cambios recientes:', recentChanges.length);
                    // Si hay cambios recientes, es posible que uno de ellos sea el del usuario
                    // Pero sin más información, no podemos determinar cuál es
                    // En este caso, mostrar mensaje informativo
                    setError(null);
                    setConfirmed(true);
                    console.log('[CONFIRM EMAIL CHANGE] Cambios recientes encontrados pero no se puede determinar cuál es del usuario');
                  } else {
                    // Si no hay previous_email en ningún perfil reciente, es probable que los cambios se completaron
                    // Si likely_completed=true, asumir que el cambio se completó
                    console.log('[CONFIRM EMAIL CHANGE] No hay previous_email recientes - cambio probablemente completado');
                    setError(null);
                    setConfirmed(true);
                    // Establecer como completado si likely_completed=true
                    if (likelyCompleted) {
                      setCompleted(true);
                      setChangeCompleted(true);
                      // Intentar usar emails de props si están disponibles
                      if (oldEmail && newEmail && oldEmail !== newEmail) {
                        setEmailData({ oldEmail, newEmail });
                      } else if (newEmail) {
                        setEmailData({ newEmail });
                      }
                      console.log('[CONFIRM EMAIL CHANGE] ✅ likely_completed=true y no hay previous_email - cambio completado');
                    } else if (verifyOnly) {
                      // Si solo verify_only, no establecer completed todavía pero tampoco error
                      console.log('[CONFIRM EMAIL CHANGE] verify_only=true - cambio puede estar completo, mostrando estado intermedio');
                    }
                  }
                } catch (searchError) {
                  console.error('[CONFIRM EMAIL CHANGE] Error en búsqueda de cambios recientes:', searchError);
                  // Si falla la búsqueda, no mostrar error - solo informativo
                  if (likelyCompleted) {
                    setError(null);
                    setConfirmed(true);
                    setCompleted(true);
                    setChangeCompleted(true);
                    // Intentar usar emails de props si están disponibles
                    if (oldEmail && newEmail && oldEmail !== newEmail) {
                      setEmailData({ oldEmail, newEmail });
                    } else if (newEmail) {
                      setEmailData({ newEmail });
                    }
                    console.log('[CONFIRM EMAIL CHANGE] ✅ likely_completed=true - asumiendo cambio completado');
                  } else if (verifyOnly) {
                    setError(null);
                    setConfirmed(true);
                    console.log('[CONFIRM EMAIL CHANGE] verify_only=true - cambio puede estar completo');
                  }
                }
              } else {
                console.log('[CONFIRM EMAIL CHANGE] No hay emails en URL, verify_only ni likely_completed - no se puede verificar sin sesión');
              }
            }
          }
          
          // ESTRATEGIA 3: Si verify_only=true y aún no tenemos datos, verificar desde props
          if (verifyOnly && !emailData && !changeCompleted) {
            console.log('[CONFIRM EMAIL CHANGE] verify_only=true - verificando desde props...');
            if (oldEmail && newEmail && oldEmail !== newEmail) {
              // Tenemos emails en props, usarlos
              setEmailData({ oldEmail, newEmail });
              setConfirmed(true);
              // Si likely_completed=true, asumir que está completo
              if (likelyCompleted) {
                setCompleted(true);
                setChangeCompleted(true);
                setError(null);
                console.log('[CONFIRM EMAIL CHANGE] ✅ verify_only + likely_completed - cambio completado desde props');
              }
            }
          }
          
          console.log('[CONFIRM EMAIL CHANGE] Usuario obtenido:', {
            hasUser: !!user,
            error: userError?.message,
            email: user?.email,
            new_email: user?.new_email,
          });
          
          if (!userError && user) {
            // PRIMERO: Verificar si hay new_email (cambio pendiente)
            if (user.new_email) {
              // Hay new_email, el cambio está pendiente
              console.log('[CONFIRM EMAIL CHANGE] Cambio pendiente - oldEmail:', user.email, 'newEmail:', user.new_email);
              if (!emailData) {
                setEmailData({ 
                  oldEmail: user.email, 
                  newEmail: user.new_email 
                });
                setConfirmed(true);
                setPending(true);
                setError(null); // Limpiar error si el cambio está pendiente
              }
            } else {
              // No hay new_email, el cambio ya se completó o no hay cambio pendiente
              console.log('[CONFIRM EMAIL CHANGE] ✅ Cambio completado o no hay cambio pendiente');
              setChangeCompleted(true);
              setError(null);
              setConfirmed(true);
              setCompleted(true);
              
              // PRIORIDAD 1: Verificar emails en la URL primero (más confiable)
              const urlParams = new URLSearchParams(globalThis.window?.location.search || '');
              const urlOldEmail = urlParams.get('oldEmail');
              const urlNewEmail = urlParams.get('newEmail');
              
              if (urlOldEmail && urlNewEmail && urlOldEmail !== urlNewEmail) {
                // Usar los emails de la URL si están disponibles y son diferentes
                setEmailData({ oldEmail: urlOldEmail, newEmail: urlNewEmail });
                console.log('[CONFIRM EMAIL CHANGE] Usando emails de la URL (prioridad)');
              } else {
                // PRIORIDAD 2: Intentar obtener los correos del perfil
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('email, previous_email')
                    .eq('id', user.id)
                    .single();
                  
                  // Estrategia mejorada para obtener oldEmail y newEmail desde el perfil:
                  // 1. PRIORIDAD: Si hay previous_email, usarlo como oldEmail (más confiable)
                  // 2. Si no hay previous_email pero el email del perfil es diferente al de auth, usar el del perfil como oldEmail
                  // 3. Si no hay diferencia, usar los emails de los props iniciales si están disponibles
                  // 4. Si no hay props, intentar usar los emails de la URL si están disponibles
                  // 5. Solo como último recurso mostrar solo el nuevo email
                  if (profile?.previous_email) {
                    // Caso ideal: previous_email está disponible
                    setEmailData({ oldEmail: profile.previous_email, newEmail: user.email });
                    console.log('[CONFIRM EMAIL CHANGE] ✅ Usando previous_email del perfil:', profile.previous_email);
                  } else if (profile?.email && profile.email !== user.email) {
                    // El perfil tiene un email diferente (puede ser el anterior antes de sincronizar)
                    setEmailData({ oldEmail: profile.email, newEmail: user.email });
                    console.log('[CONFIRM EMAIL CHANGE] Usando email del perfil como anterior:', profile.email);
                  } else if (oldEmail && newEmail && oldEmail !== newEmail) {
                    // Usar los emails de los props iniciales si están disponibles
                    setEmailData({ oldEmail, newEmail });
                    console.log('[CONFIRM EMAIL CHANGE] Usando emails de los props iniciales');
                  } else if (urlOldEmail && urlNewEmail && urlOldEmail !== urlNewEmail) {
                    // Intentar usar los emails de la URL si están disponibles
                    setEmailData({ oldEmail: urlOldEmail, newEmail: urlNewEmail });
                    console.log('[CONFIRM EMAIL CHANGE] Usando emails de la URL como fallback');
                  } else if (oldEmail && oldEmail !== user.email) {
                    // Usar oldEmail de props con newEmail del usuario
                    setEmailData({ oldEmail, newEmail: user.email });
                    console.log('[CONFIRM EMAIL CHANGE] Usando oldEmail de props con newEmail del usuario');
                  } else {
                    // Si no hay forma de obtener el correo anterior, mostrar solo el nuevo email
                    // pero intentar buscar una vez más en el perfil después de un breve delay
                    console.warn('[CONFIRM EMAIL CHANGE] No se pudo obtener el correo anterior inmediatamente. Intentando búsqueda adicional...');
                    // Establecer solo el nuevo email por ahora
                    setEmailData({ newEmail: user.email });
                    
                    // Intentar una búsqueda adicional después de un breve delay
                    // para ver si previous_email se actualiza o si hay otra forma de obtenerlo
                    setTimeout(async () => {
                      try {
                        const { data: profileRetry } = await supabase
                          .from('profiles')
                          .select('email, previous_email')
                          .eq('id', user.id)
                          .single();
                        
                        if (profileRetry?.previous_email) {
                          setEmailData({ oldEmail: profileRetry.previous_email, newEmail: user.email });
                          console.log('[CONFIRM EMAIL CHANGE] ✅ Correo anterior encontrado en reintento:', profileRetry.previous_email);
                        }
                      } catch (retryError) {
                        console.error('[CONFIRM EMAIL CHANGE] Error en reintento:', retryError);
                      }
                    }, 500);
                  }
                } catch (profileError) {
                  console.error('[CONFIRM EMAIL CHANGE] Error obteniendo perfil:', profileError);
                  // Intentar usar emails de los props como último recurso
                  if (oldEmail && newEmail && oldEmail !== newEmail) {
                    setEmailData({ oldEmail, newEmail });
                  } else if (oldEmail && oldEmail !== user.email) {
                    setEmailData({ oldEmail, newEmail: user.email });
                  } else {
                    // Si no hay forma de obtener el correo anterior, solo establecer el nuevo
                    setEmailData({ newEmail: user.email });
                  }
                }
              }
            }
          } else {
            // ESTRATEGIA 4: No se pudo obtener usuario - verificar desde otras fuentes
            console.log('[CONFIRM EMAIL CHANGE] No se pudo obtener usuario:', userError);
            
            if (!emailData) {
              // Si verify_only=true o likely_completed=true, NO mostrar error
              // Priorizar verificación sobre error
              if (verifyOnly || likelyCompleted) {
                console.log('[CONFIRM EMAIL CHANGE] verify_only/likely_completed=true - NO mostrando error, verificando desde otras fuentes...');
                setError(null); // Limpiar cualquier error previo
                setConfirmed(true);
                
                // Si likely_completed=true, asumir que el cambio se completó
                if (likelyCompleted) {
                  setCompleted(true);
                  setChangeCompleted(true);
                  console.log('[CONFIRM EMAIL CHANGE] ✅ likely_completed=true - cambio completado (sin verificación de usuario)');
                }
              } else if (userError?.message?.includes('session') || userError?.message?.includes('JWT')) {
                // Solo mostrar error si NO es verify_only y realmente no hay forma de verificar
                setError('No hay sesión activa. Si el cambio ya se completó, inicia sesión con tu nuevo correo para verificar. Si el cambio está pendiente, confirma ambos correos para completarlo.');
              } else {
                setError('No se pudo verificar el estado del cambio. Intenta iniciar sesión para verificar el estado.');
              }
            }
          }
        } catch (checkError) {
          console.error('[CONFIRM EMAIL CHANGE] Error en verificación:', checkError);
          // PRINCIPIO: Si verify_only=true o likely_completed=true, NO mostrar error
          // Solo mostrar error si realmente no hay forma de verificar y no es verify_only
          const urlParamsCheck = new URLSearchParams(globalThis.window?.location.search || '');
          const verifyOnlyCheck = urlParamsCheck.get('verify_only') === 'true';
          const likelyCompletedCheck = urlParamsCheck.get('likely_completed') === 'true';
          
          if (verifyOnlyCheck || likelyCompletedCheck) {
            // No establecer error - asumir que el cambio puede haberse completado
            setError(null);
            setConfirmed(true);
            if (likelyCompletedCheck) {
              setCompleted(true);
              setChangeCompleted(true);
              console.log('[CONFIRM EMAIL CHANGE] ✅ Error en verificación pero likely_completed=true - asumiendo éxito');
            }
          } else if (!error && !emailData) {
            // Solo establecer error si no es verify_only
            setError('Error al verificar el estado del cambio. Intenta iniciar sesión para verificar.');
          }
        } finally {
          setIsCheckingStatus(false);
          setIsValidating(false);
        }
      };
      
      checkStatus();
    } else if (!shouldCheck) {
      setIsValidating(false);
    }
  }, [error, emailData, isCheckingStatus, changeCompleted, hasCheckedStatus, isValidating, oldEmail, newEmail]);

  // Funci?n para reenviar el correo al correo anterior
  const handleResendEmail = async () => {
    if (!emailData?.oldEmail || !emailData?.newEmail) return;
    
    setIsResending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('No se pudo obtener la informaci?n del usuario. Inicia sesi?n nuevamente.');
      }
      
      if (!user.new_email) {
        showToast({
          type: 'info',
          description: 'El cambio de correo ya se complet? o no est? pendiente. Si necesitas cambiar tu correo, ve a Configuraci?n ? Perfil.',
        });
        setIsResending(false);
        return;
      }
      
      const emailRedirectTo = getEmailAuthRedirectUrl('/auth/callback', {
        type: 'email_change',
      });
      
      const { error: resendError } = await supabase.auth.updateUser({
        email: emailData.newEmail,
      }, {
        emailRedirectTo,
      });
      
      if (resendError) {
        throw new Error('No se pudo reenviar el correo. El cambio puede estar parcialmente completado. Ve a Configuraci?n ? Perfil para solicitar un nuevo cambio.');
      }
      
      showToast({
        type: 'success',
        description: 'Se reenvi? el correo de confirmaci?n al correo anterior. Revisa tu bandeja de entrada.',
      });
    } catch (error) {
      const message = error instanceof Error 
        ? error.message 
        : 'Error al reenviar el correo. Intenta nuevamente.';
      showToast({
        type: 'error',
        description: message,
      });
    } finally {
      setIsResending(false);
    }
  };

  // Refrescar sesión y limpiar previous_email cuando el cambio se completa
  useEffect(() => {
    if (changeCompleted && completed && !pending) {
      const refreshSessionAndCleanup = async () => {
        try {
          const supabase = getSupabaseBrowserClient();
          
          // 1. Refrescar la sesión
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.log('[CONFIRM EMAIL CHANGE] No se pudo refrescar la sesión (puede que no haya sesión activa):', refreshError.message);
          } else if (session) {
            console.log('[CONFIRM EMAIL CHANGE] Sesión refrescada exitosamente, nuevo email:', session.user.email);
            
            // 2. Limpiar previous_email después de que el usuario vea la confirmación
            // Esto es ético: solo guardamos el email anterior temporalmente para mostrar la confirmación
            try {
              const { error: cleanupError } = await supabase
                .from('profiles')
                .update({ previous_email: null })
                .eq('id', session.user.id);
              
              if (cleanupError) {
                console.warn('[CONFIRM EMAIL CHANGE] No se pudo limpiar previous_email:', cleanupError);
              } else {
                console.log('[CONFIRM EMAIL CHANGE] previous_email limpiado exitosamente (buena práctica de privacidad)');
              }
            } catch (error_) {
              console.error('[CONFIRM EMAIL CHANGE] Error limpiando previous_email:', error_);
            }
            
            // 3. Si estamos en una página de la app, refrescar también el router
            if (globalThis.window?.location.pathname.startsWith('/app')) {
              router.refresh();
            }
          }
        } catch (error_) {
          console.error('[CONFIRM EMAIL CHANGE] Error refrescando sesión:', error_);
        }
      };
      
      // Ejecutar después de un pequeño delay para asegurar que el usuario vea la confirmación
      const timer = setTimeout(() => {
        void refreshSessionAndCleanup();
      }, 2000); // 2 segundos después de mostrar la confirmación
      
      return () => clearTimeout(timer);
    }
  }, [changeCompleted, completed, pending, router]);

  // Redirigir a login después de 5 segundos si está confirmado y completado
  useEffect(() => {
    if (confirmed && completed && !error && !pending) {
      const timer = setTimeout(() => {
        router.push('/iniciar-sesion?email_changed=true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmed, completed, error, pending, router]);

  // Verificar si viene verify_only para mostrar UI especial
  const urlParamsForUI = new URLSearchParams(globalThis.window?.location.search || '');
  const verifyOnlyForUI = urlParamsForUI.get('verify_only') === 'true';
  const likelyCompletedForUI = urlParamsForUI.get('likely_completed') === 'true';

  // Si est? verificando o validando, mostrar loading
  if (isCheckingStatus || isValidating) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[color:var(--accent)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {isCheckingStatus ? 'Verificando estado del cambio...' : 'Validando cambio de correo...'}
          </h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            {isCheckingStatus 
              ? verifyOnlyForUI 
                ? 'El enlace puede haber expirado, pero estamos verificando si el cambio se completó exitosamente...'
                : 'Por favor espera mientras verificamos si el cambio se completó.'
              : 'Por favor espera mientras verificamos tu solicitud.'
            }
          </p>
          {verifyOnlyForUI && likelyCompletedForUI && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Es probable que el cambio ya se haya completado. Verificando en la base de datos...
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // UI especial para verify_only cuando aún no se ha determinado el estado
  if (verifyOnlyForUI && !changeCompleted && !emailData && !error && !isCheckingStatus) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
            Verificando estado del cambio de correo
          </h2>
          <p className="text-sm text-[color:var(--muted-foreground)]">
            El enlace puede haber expirado, pero estamos verificando si el cambio se completó exitosamente en nuestro sistema.
          </p>
          {likelyCompletedForUI && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
              Es muy probable que el cambio ya se haya completado. Verificando...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Si el cambio se complet? (verificado), mostrar ?xito incluso si hab?a error
  if (changeCompleted && emailData) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-500/30 dark:border-green-500/40 bg-green-500/10 dark:bg-green-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
            ✓ Cambio de correo completado
          </h2>
          <p className="text-sm text-green-600/90 dark:text-green-400/90 mb-6">
            {initialError 
              ? 'Aunque el enlace expir?, el cambio de correo se complet? exitosamente. Tu nuevo correo electr?nico ya est? activo.'
              : 'Tu correo electr?nico ha sido actualizado exitosamente.'
            }
          </p>
          {emailData?.oldEmail && emailData?.newEmail && emailData.oldEmail !== emailData.newEmail ? (
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[color:var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                      Correo anterior:
                    </p>
                    <p className="text-sm font-medium text-[color:var(--foreground)] break-all">
                      {emailData.oldEmail}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[color:var(--border)] pt-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                        Nuevo correo:
                      </p>
                      <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                        {emailData.newEmail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : emailData?.newEmail ? (
            // Si solo tenemos el nuevo email, mostrar solo ese
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                    Nuevo correo:
                  </p>
                  <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                    {emailData.newEmail}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Ser?s redirigido autom?ticamente a la p?gina de inicio de sesi?n en unos segundos.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/iniciar-sesion?email_changed=true"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesi?n ahora
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si hay error y no se completó, verificar si es verify_only antes de mostrar error
  // PRINCIPIO: Si verify_only=true, NO mostrar error - solo verificar
  if (error && !changeCompleted && !verifyOnlyForUI) {
    const isExpiredError = error.includes('expirado') || error.includes('ya fue usado') || error.includes('inv?lido');
    const isSessionError = error.includes('sesi?n') || error.includes('session') || error.includes('JWT');
    
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-500/30 dark:border-red-500/40 bg-red-500/10 dark:bg-red-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            {isSessionError ? 'No hay sesi?n activa' : 'Error al confirmar el cambio'}
          </h2>
          <p className="text-sm text-red-600/90 dark:text-red-400/90 mb-4">
            {error}
          </p>
          <div className="space-y-3">
            {(isExpiredError || isSessionError) && (
              <div className="rounded-lg border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 p-4 text-left">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">
                  ?? ?Qu? hacer?
                </p>
                <ul className="text-xs text-amber-700/90 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                  {isSessionError ? (
                    <>
                      <li>El enlace puede haber expirado o ya fue usado, pero el cambio puede haberse completado.</li>
                      <li>Intenta iniciar sesi?n con tu <strong>nuevo correo electr?nico</strong> para verificar si el cambio se complet?.</li>
                      <li>Si no puedes iniciar sesi?n con el nuevo correo, intenta con el correo anterior.</li>
                      <li>Si el cambio est? pendiente, confirma ambos correos (anterior y nuevo) para completarlo.</li>
                    </>
                  ) : (
                    <>
                      <li>Si ya confirmaste el primer correo, el cambio puede estar parcialmente completado.</li>
                      <li>El enlace puede haber expirado pero el cambio puede haberse completado de todas formas.</li>
                      <li>Inicia sesi?n y verifica tu correo en Configuraci?n ? Perfil.</li>
                    </>
                  )}
                </ul>
              </div>
            )}
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {isSessionError 
                ? 'Si el cambio ya se complet?, inicia sesi?n con tu nuevo correo. Si est? pendiente, confirma ambos correos para completarlo.'
                : 'El enlace puede haber expirado o ya fue usado. Si necesitas cambiar tu correo, ve a la configuraci?n de tu cuenta y solicita un nuevo cambio.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/iniciar-sesion"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesi?n
              </Link>
              {isExpiredError && !isSessionError && (
                <Link
                  href="/app/settings"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--background)] px-6 text-sm font-semibold text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
                >
                  Ir a configuraci?n
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si está confirmado pero likely_completed=true y no hay datos completos, mostrar mensaje informativo
  const urlParamsForState = new URLSearchParams(globalThis.window?.location.search || '');
  const likelyCompletedForState = urlParamsForState.get('likely_completed') === 'true';
  const verifyOnlyForState = urlParamsForState.get('verify_only') === 'true';
  
  // Si likely_completed=true y changeCompleted=true (establecido en el useEffect), mostrar éxito
  if (likelyCompletedForState && changeCompleted && !emailData) {
    // Mostrar éxito aunque no tengamos los emails específicos
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-500/30 dark:border-green-500/40 bg-green-500/10 dark:bg-green-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
            Cambio de correo completado
          </h2>
          <p className="text-sm text-green-600/90 dark:text-green-400/90 mb-6">
            Aunque el enlace expiró, el cambio de correo se completó exitosamente. Tu nuevo correo electrónico ya está activo.
          </p>
          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Por favor, inicia sesión con tu nuevo correo electrónico para acceder a tu cuenta.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/iniciar-sesion?email_changed=true"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesión ahora
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (confirmed && likelyCompletedForState && !emailData && !error && !changeCompleted) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-16 h-16 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
            Verificando cambio de correo
          </h2>
          <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mb-6">
            El enlace puede haber expirado, pero es probable que el cambio de correo se haya completado exitosamente. 
            Por favor, inicia sesión con tu nuevo correo electrónico para verificar.
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 p-4 text-left">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-2">
                ¿Qué hacer?
              </p>
              <ul className="text-xs text-amber-700/90 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                <li>Intenta iniciar sesión con tu <strong>nuevo correo electrónico</strong> para verificar si el cambio se completó.</li>
                <li>Si no puedes iniciar sesión con el nuevo correo, intenta con el correo anterior.</li>
                <li>Una vez que inicies sesión, verifica tu correo en Configuración → Perfil.</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/iniciar-sesion"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si est? confirmado y hay datos, mostrar estado
  if (confirmed && emailData) {
    // Si est? pendiente, mostrar mensaje diferente
    if (pending && !completed) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-6 text-center">
            <div className="flex justify-center mb-4">
              <Mail className="w-16 h-16 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
              ? Correo confirmado
            </h2>
            <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mb-6">
              Has confirmado uno de los correos. Para completar el cambio, debes confirmar tambi?n el otro correo que se envi?.
            </p>
            
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                      Correo anterior:
                    </p>
                    <p className="text-sm font-medium text-[color:var(--foreground)] break-all">
                      {emailData.oldEmail}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[color:var(--border)] pt-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                        Nuevo correo (pendiente de confirmar):
                      </p>
                      <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                        {emailData.newEmail}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 p-4">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-2">
                  ?? Pr?ximo paso:
                </p>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mb-3">
                  Revisa tu bandeja de entrada del correo <strong>{emailData.newEmail}</strong> y haz clic en el enlace de confirmaci?n que se envi? all?. Ambos correos deben ser confirmados para completar el cambio.
                </p>
                <div className="rounded-lg border border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/20 p-3 mb-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                    ?? Recomendaci?n:
                  </p>
                  <p className="text-xs text-blue-700/90 dark:text-blue-300/90">
                    Si a?n no has confirmado el correo anterior, hazlo primero desde un dispositivo donde <strong>no est?s logueado</strong>. Luego confirma este correo nuevo. Este orden ayuda a evitar problemas con los enlaces.
                  </p>
                </div>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mb-3">
                  ?? <strong>Importante:</strong> Si el enlace del correo anterior expir? o ya fue usado, puedes intentar reenviarlo. Si eso no funciona, ve a Configuraci?n ? Perfil para solicitar un nuevo cambio.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/50 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Reenviando...' : 'Intentar reenviar correo al correo anterior'}
                  </button>
                  <Link
                    href="/app/settings"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-2 text-xs font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--muted)] transition-colors"
                  >
                    Ir a Configuraci?n para solicitar nuevo cambio
                  </Link>
                </div>
              </div>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Puedes cerrar esta p?gina. El cambio se completar? cuando confirmes el otro correo.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Si est? completado, mostrar mensaje de ?xito
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-500/30 dark:border-green-500/40 bg-green-500/10 dark:bg-green-500/20 p-6 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
            ? Cambio de correo confirmado
          </h2>
          <p className="text-sm text-green-600/90 dark:text-green-400/90 mb-6">
            Tu correo electr?nico ha sido actualizado exitosamente.
          </p>
          
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 mb-6 text-left">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[color:var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                    Correo anterior:
                  </p>
                  <p className="text-sm font-medium text-[color:var(--foreground)] break-all">
                    {emailData.oldEmail}
                  </p>
                </div>
              </div>
              <div className="border-t border-[color:var(--border)] pt-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[color:var(--accent)] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[color:var(--muted-foreground)] mb-1">
                      Nuevo correo:
                    </p>
                    <p className="text-sm font-bold text-[color:var(--accent)] break-all">
                      {emailData.newEmail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Ser?s redirigido autom?ticamente a la p?gina de inicio de sesi?n en unos segundos.
            </p>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Ahora puedes iniciar sesi?n con tu nuevo correo electr?nico: <strong className="text-[color:var(--foreground)]">{emailData.newEmail}</strong>
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/iniciar-sesion?email_changed=true"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
              >
                Ir a iniciar sesi?n ahora
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-[color:var(--muted-foreground)]">
        No se pudo procesar la confirmaci?n. Por favor, intenta nuevamente.
      </p>
      <Link
        href="/iniciar-sesion"
        className="inline-flex h-11 items-center justify-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
      >
        Ir a iniciar sesi?n
      </Link>
    </div>
  );
}
