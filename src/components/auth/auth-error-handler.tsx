'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Componente que detecta errores de autenticación y códigos en la URL y redirige apropiadamente
 * Esto maneja casos donde Supabase redirige a la página principal con errores o códigos
 */
export function AuthErrorHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');
    const type = searchParams.get('type');
    
    // También verificar el hash (Supabase a veces pone errores ahí)
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const hashCode = hashParams.get('code');
    const hashError = hashParams.get('error');
    const hashErrorCode = hashParams.get('error_code');
    const hashErrorDescription = hashParams.get('error_description');
    const hashType = hashParams.get('type');

    const finalCode = code || hashCode;
    const finalError = error || hashError;
    const finalErrorCode = errorCode || hashErrorCode;
    const finalErrorDescription = errorDescription || hashErrorDescription;
    const finalType = type || hashType;

    // Si hay un código, redirigir al callback (Supabase redirigió directamente a la home)
    if (finalCode) {
      console.log('[AUTH ERROR HANDLER] Código detectado en URL, redirigiendo al callback', {
        code: finalCode.substring(0, 20) + '...',
        type: finalType,
      });
      // Determinar el tipo basándose en el contexto
      // Si no hay tipo, intentar inferirlo del contexto de la URL o usar recovery por defecto
      let callbackType = finalType;
      
      // Si no hay tipo pero hay código, puede ser recovery (reset password) o signup (registro)
      // Por defecto asumimos recovery ya que es el caso más común cuando Supabase redirige a la home
      if (!callbackType) {
        // Verificar si la URL anterior tenía información sobre el tipo
        const referrer = typeof window !== 'undefined' ? document.referrer : '';
        if (referrer.includes('recovery') || referrer.includes('reset') || referrer.includes('password')) {
          callbackType = 'recovery';
        } else if (referrer.includes('signup') || referrer.includes('register')) {
          callbackType = 'signup';
        } else {
          callbackType = 'recovery'; // Por defecto recovery
        }
      }
      
      const callbackUrl = `/auth/callback?code=${encodeURIComponent(finalCode)}&type=${callbackType}`;
      console.log('[AUTH ERROR HANDLER] Redirigiendo a:', callbackUrl);
      router.replace(callbackUrl);
      return;
    }

    if (finalError) {
      // Determinar el tipo de error y redirigir apropiadamente
      let redirectPath = '/iniciar-sesion';
      let errorMessage = 'Error al procesar la autenticación';

      if (finalErrorCode === 'otp_expired' || finalError === 'access_denied') {
        if (finalErrorDescription?.includes('expired') || finalErrorDescription?.includes('invalid')) {
          errorMessage = 'El enlace ha expirado o ya fue usado. Solicita uno nuevo.';
          // Si es un error de reset password, redirigir a la página de recuperar
          redirectPath = '/recuperar?error=expired';
        } else {
          errorMessage = finalErrorDescription 
            ? decodeURIComponent(finalErrorDescription.replace(/\+/g, ' '))
            : 'El enlace no es válido o ha expirado.';
          redirectPath = '/iniciar-sesion?error=' + encodeURIComponent(errorMessage);
        }
      } else if (finalErrorDescription) {
        errorMessage = decodeURIComponent(finalErrorDescription.replace(/\+/g, ' '));
        redirectPath = '/iniciar-sesion?error=' + encodeURIComponent(errorMessage);
      }

      // Limpiar la URL y redirigir
      const newUrl = redirectPath + (redirectPath.includes('?') ? '&' : '?') + '_redirected=true';
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  return null;
}
