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
      console.log('[AUTH ERROR HANDLER] Código detectado en URL, redirigiendo al callback');
      // Determinar el tipo basándose en el contexto o usar recovery por defecto si viene de reset password
      const callbackType = finalType || 'recovery'; // Por defecto recovery si no hay tipo
      const callbackUrl = `/auth/callback?code=${finalCode}&type=${callbackType}`;
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
