'use client';

import Link from 'next/link';
import { useState } from 'react';

interface QuickAction {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly href: string;
  readonly color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'Ver Sorteos',
    description: 'Explora sorteos activos',
    icon: '🎁',
    href: '/sorteos',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    title: 'Mis Boletos',
    description: 'Revisa tus participaciones',
    icon: '🎫',
    href: '/dashboard/boletos',
    color: 'from-purple-500 to-pink-500'
  },
  {
    title: 'Suscribirme',
    description: 'Ver planes disponibles',
    icon: '⭐',
    href: '/planes',
    color: 'from-orange-500 to-red-500'
  },
  {
    title: 'Mi Perfil',
    description: 'Actualizar información',
    icon: '👤',
    href: '/settings',
    color: 'from-green-500 to-emerald-500'
  },
];

export function QuickActionsGrid() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {QUICK_ACTIONS.map((action, index) => (
        <Link
          key={action.title}
          href={action.href}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="group relative overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 transition-all hover:shadow-lg hover:-translate-y-1"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
          
          <div className="relative z-10">
            <div className="text-4xl mb-3 transform transition-transform group-hover:scale-110">
              {action.icon}
            </div>
            <h3 className="font-semibold text-[color:var(--foreground)] mb-1 text-sm lg:text-base">
              {action.title}
            </h3>
            <p className="text-xs text-[color:var(--muted-foreground)]">
              {action.description}
            </p>
          </div>
          
          {hoveredIndex === index && (
            <div className="absolute bottom-2 right-2 text-[color:var(--accent)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}