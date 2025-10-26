'use client';

import Link from 'next/link';

interface QuickAction {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly href: string;
  readonly color: string;
  readonly badge?: string;
  readonly isNew?: boolean;
}

interface QuickActionsGridProps {
  readonly activeRafflesCount?: number;
}

const getQuickActions = (activeRafflesCount?: number): QuickAction[] => [
  {
    title: 'Ver Sorteos',
    description: 'Explora sorteos activos',
    icon: '🎁',
    href: '/app/sorteos',
    color: 'from-blue-500 to-cyan-500',
    badge: activeRafflesCount && activeRafflesCount > 0 ? String(activeRafflesCount) : undefined,
  },
  {
    title: 'Mis Boletos',
    description: 'Revisa tus participaciones',
    icon: '🎫',
    href: '/app/boletos',
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Suscribirme',
    description: 'Ver planes disponibles',
    icon: '⭐',
    href: '/app/planes',
    color: 'from-orange-500 to-red-500',
    isNew: true,
  },
  {
    title: 'Mi Perfil',
    description: 'Actualizar información',
    icon: '👤',
    href: '/app/settings',
    color: 'from-green-500 to-emerald-500',
  },
];

export function QuickActionsGrid({ activeRafflesCount }: QuickActionsGridProps = {}) {
  const quickActions = getQuickActions(activeRafflesCount);
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {quickActions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className="group block"
        >
          <div className="relative bg-[color:var(--card)] border-2 border-[color:var(--border)] rounded-2xl p-4 sm:p-5 lg:p-6 transition-all duration-300 overflow-hidden min-h-[140px] sm:min-h-[160px] group-hover:shadow-2xl group-hover:border-[color:var(--accent)]/50">
            {/* Fondo animado con gradiente */}
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />
            
            {/* Efecto de brillo en hover */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-2xl" />

            {/* Badges superiores - Con posicionamiento correcto */}
            <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-20 pointer-events-none">
              <div className="flex-1" />
              
              {/* Badge "Nuevo" si aplica */}
              {action.isNew && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-black rounded-full animate-pulse shadow-lg whitespace-nowrap">
                  NUEVO
                </span>
              )}
              
              {/* Badge con contador si aplica */}
              {action.badge && (
                <span className="flex items-center justify-center min-w-5 h-5 sm:min-w-6 sm:h-6 px-1 sm:px-1.5 bg-[color:var(--accent)] text-white text-[10px] sm:text-xs font-black rounded-full shadow-lg animate-bounce">
                  {action.badge}
                </span>
              )}
            </div>
  
            {/* Contenedor del icono con animación - Con margin-top para evitar overlap */}
            <div className="relative z-10 mt-6 sm:mt-4">
              <div className={`relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br ${action.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                <span className="text-2xl sm:text-3xl lg:text-4xl group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </span>
                
                {/* Anillo de resplandor */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} rounded-xl sm:rounded-2xl blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-300 -z-10`} />
              </div>
  
              {/* Título y descripción */}
              <div className="relative">
                <h3 className="font-bold text-[color:var(--foreground)] mb-1 sm:mb-1.5 text-xs sm:text-sm lg:text-base group-hover:text-[color:var(--accent)] transition-colors duration-200 line-clamp-1">
                  {action.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] group-hover:text-[color:var(--foreground)] transition-colors duration-200 line-clamp-2">
                  {action.description}
                </p>
  
                {/* Indicador de acción */}
                <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-[color:var(--accent)] opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <span className="hidden sm:inline">Ir ahora</span>
                  <span className="sm:hidden">Ir</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>
              </div>
            </div>

            {/* Borde animado */}
            <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl`} />
            
            {/* Esquina decorativa - Solo visible en pantallas grandes */}
            <div className="pointer-events-none hidden sm:block absolute bottom-0 right-0 w-16 h-16 sm:w-20 sm:h-20 opacity-0 group-hover:opacity-10 transition-opacity duration-300 overflow-hidden rounded-br-2xl">
              <div className={`w-full h-full bg-gradient-to-tl ${action.color} rounded-tl-full`} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
