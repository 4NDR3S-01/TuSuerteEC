'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../hooks/use-toast';
import { Mail, CheckCircle2 } from 'lucide-react';

/**
 * Componente que detecta mensajes de Supabase sobre cambio de correo en el hash de la URL
 * Cuando se confirma el primer correo, Supabase redirige a /app#message=...
 * Este componente muestra un mensaje informativo al usuario
 */
export function EmailChangeMessageHandler() {
  const router = useRouter();
  const { showToast } = useToast();
  const [hasShown, setHasShown] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Verificar el hash de la URL
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const hashMessage = hashParams.get('message');

    if (hashMessage && !hasShown) {
      setHasShown(true);
      
      // Decodificar el mensaje
      const decodedMessage = decodeURIComponent(hashMessage.replace(/\+/g, ' '));
      
      // Verificar si es el mensaje de cambio de correo
      if (
        decodedMessage.includes('Confirmation link accepted') ||
        decodedMessage.includes('Please proceed to confirm link sent to the other email') ||
        decodedMessage.includes('confirm link sent to the other email')
      ) {
        setMessage(decodedMessage);
        setShowBanner(true);
        
        // Mostrar toast informativo
        showToast({
          type: 'info',
          description: 'Primer correo confirmado. Revisa tu correo anterior para completar el cambio.',
        });

        // Limpiar el hash después de un tiempo
        setTimeout(() => {
          const newUrl = new URL(window.location.href);
          newUrl.hash = '';
          window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
          setShowBanner(false);
        }, 10000); // Mostrar por 10 segundos
      }
    }
  }, [hasShown, showToast]);

  if (!showBanner || !message) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[color:var(--background)] border-b border-[color:var(--border)] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex-shrink-0 mt-0.5">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Cambio de correo en proceso
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  Has confirmado tu nuevo correo electrónico. Para completar el cambio,{' '}
                  <strong>debes confirmar también el correo que se envió a tu dirección anterior</strong>.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Revisa tu bandeja de entrada del correo anterior</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBanner(false);
                  const newUrl = new URL(window.location.href);
                  newUrl.hash = '';
                  window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
                }}
                className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
