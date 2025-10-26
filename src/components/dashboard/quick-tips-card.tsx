'use client';

import { useState } from 'react';

interface QuickTip {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action?: {
    label: string;
    href: string;
  };
}

const TIPS: QuickTip[] = [
  {
    id: 'subscribe',
    title: 'Participa Automáticamente',
    description: 'Con una suscripción activa, participas en todos los sorteos sin necesidad de comprar boletos individuales.',
    icon: '⭐',
    color: 'from-purple-500 to-pink-500',
    action: {
      label: 'Ver Planes',
      href: '/planes',
    },
  },
  {
    id: 'participate',
    title: 'Aumenta tus Probabilidades',
    description: 'Mientras más participaciones tengas, mayores son tus oportunidades de ganar increíbles premios.',
    icon: '🎯',
    color: 'from-blue-500 to-cyan-500',
    action: {
      label: 'Ver Sorteos',
      href: '/sorteos',
    },
  },
  {
    id: 'notifications',
    title: 'Activa Notificaciones',
    description: 'Recibe alertas en tiempo real sobre nuevos sorteos, resultados y eventos especiales en vivo.',
    icon: '🔔',
    color: 'from-orange-500 to-red-500',
    action: {
      label: 'Configurar',
      href: '/settings',
    },
  },
  {
    id: 'profile',
    title: 'Completa tu Perfil',
    description: 'Asegúrate de tener tu información actualizada para recibir tus premios sin problemas.',
    icon: '👤',
    color: 'from-green-500 to-emerald-500',
    action: {
      label: 'Mi Perfil',
      href: '/settings',
    },
  },
];

export function QuickTipsCard() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const currentTip = TIPS[currentTipIndex];

  const handleNext = () => {
    if (currentTipIndex < TIPS.length - 1) {
      setCurrentTipIndex(prev => prev + 1);
    } else {
      setCurrentTipIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentTipIndex > 0) {
      setCurrentTipIndex(prev => prev - 1);
    } else {
      setCurrentTipIndex(TIPS.length - 1);
    }
  };

  return (
    <div className="group relative bg-gradient-to-br from-[color:var(--card)] to-[color:var(--muted)]/50 border border-[color:var(--border)] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentTip.color} opacity-5 transition-opacity duration-500`} />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 bg-gradient-to-br ${currentTip.color} rounded-xl flex items-center justify-center text-xl shadow-md`}>
            {currentTip.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[color:var(--foreground)]">Consejo Rápido</h3>
            <p className="text-[10px] text-[color:var(--muted-foreground)]">
              {currentTipIndex + 1} de {TIPS.length}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsDismissed(true)}
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors p-1"
          title="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 mb-6">
        <h4 className="text-base font-bold text-[color:var(--foreground)] mb-2">
          {currentTip.title}
        </h4>
        <p className="text-sm text-[color:var(--muted-foreground)] leading-relaxed">
          {currentTip.description}
        </p>
      </div>

      {/* Actions */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            className="w-8 h-8 rounded-lg bg-[color:var(--muted)] hover:bg-[color:var(--accent)]/10 text-[color:var(--foreground)] flex items-center justify-center transition-colors"
            title="Anterior"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {TIPS.map((tip, index) => (
              <button
                key={tip.id}
                onClick={() => setCurrentTipIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentTipIndex
                    ? 'w-6 bg-[color:var(--accent)]'
                    : 'w-1.5 bg-[color:var(--border)] hover:bg-[color:var(--accent)]/50'
                }`}
                title={`Ir al tip ${index + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-lg bg-[color:var(--muted)] hover:bg-[color:var(--accent)]/10 text-[color:var(--foreground)] flex items-center justify-center transition-colors"
            title="Siguiente"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Action Button */}
        {currentTip.action && (
          <a
            href={currentTip.action.href}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${currentTip.color} text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
          >
            <span>{currentTip.action.label}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
