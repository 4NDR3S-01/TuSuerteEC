'use client';

import { useState, useEffect } from 'react';
import { Radio, Calendar, Film, X } from 'lucide-react';

type LiveEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  stream_url: string | null;
  status: string;
};

type LiveEventAlertBarProps = {
  event: LiveEvent | null;
};

export function LiveEventAlertBar({ event }: Readonly<LiveEventAlertBarProps>) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!event) return;

    // Verificar si el usuario ya cerró esta alerta
    const dismissedEvents = JSON.parse(localStorage.getItem('dismissedEventAlerts') || '[]');
    if (dismissedEvents.includes(event.id)) {
      setIsDismissed(true);
      return;
    }

    // Mostrar la alerta con una pequeña animación
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, [event]);

  const handleDismiss = () => {
    if (!event) return;
    
    setIsVisible(false);
    
    // Guardar en localStorage que el usuario cerró esta alerta
    const dismissedEvents = JSON.parse(localStorage.getItem('dismissedEventAlerts') || '[]');
    if (!dismissedEvents.includes(event.id)) {
      dismissedEvents.push(event.id);
      localStorage.setItem('dismissedEventAlerts', JSON.stringify(dismissedEvents));
    }
    
    setTimeout(() => setIsDismissed(true), 300);
  };

  // No mostrar si no hay evento, fue cerrada o está oculta
  if (!event || isDismissed) return null;

  const isLive = event.status === 'live';
  const eventDate = new Date(event.start_at);
  const now = new Date();
  const isUpcoming = eventDate > now;

  return (
    <div
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div
        className={`border-b shadow-lg ${
          isLive
            ? 'border-red-500 dark:border-red-600 bg-gradient-to-r from-red-500 dark:from-red-600 via-red-600 dark:via-red-700 to-red-500 dark:to-red-600'
            : isUpcoming
            ? 'border-blue-500 dark:border-blue-600 bg-gradient-to-r from-blue-500 dark:from-blue-600 via-blue-600 dark:via-blue-700 to-blue-500 dark:to-blue-600'
            : 'border-emerald-500 dark:border-emerald-600 bg-gradient-to-r from-emerald-500 dark:from-emerald-600 via-emerald-600 dark:via-emerald-700 to-emerald-500 dark:to-emerald-600'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Contenido principal */}
            <div className="flex flex-1 items-center gap-3 sm:gap-4">
              {/* Icono animado */}
              <div className="flex-shrink-0">
                {isLive ? (
                  <div className="relative">
                    <Radio className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    <span className="absolute -right-1 -top-1 flex h-3 w-3 sm:h-4 sm:w-4">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-white"></span>
                    </span>
                  </div>
                ) : isUpcoming ? (
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                ) : (
                  <Film className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                )}
              </div>

              {/* Información del evento */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isLive && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      ● EN VIVO
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      PRÓXIMAMENTE
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {event.title}
                  </h3>
                </div>
                
                {event.description && (
                  <p className="mt-0.5 text-xs sm:text-sm text-white/90 line-clamp-1">
                    {event.description}
                  </p>
                )}
                
                <p className="mt-1 text-xs text-white/80 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>{eventDate.toLocaleDateString('es-EC', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</span>
                  <span>•</span>
                  <span>{eventDate.toLocaleTimeString('es-EC', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2">
              {event.stream_url && (
                <a
                  href={event.stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-md transition-transform hover:scale-105 hover:shadow-lg"
                >
                  {isLive ? (
                    <>
                      <Radio className="w-4 h-4" />
                      <span className="hidden sm:inline">Ver Ahora</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span className="hidden sm:inline">Más Info</span>
                    </>
                  )}
                </a>
              )}
              
              <button
                onClick={handleDismiss}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Cerrar alerta"
                title="Cerrar alerta"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveEventAlertBar;
