'use client';

import { type ReactNode } from 'react';

interface StatCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly icon: ReactNode;
  readonly trend?: {
    value: number;
    isPositive: boolean;
  };
  readonly description?: string;
  readonly maxValue?: number;
  readonly color?: string;
  readonly isText?: boolean; // Nueva prop para indicar si el valor es texto
}

export function StatCard({ title, value, icon, trend, description, maxValue, color = 'var(--accent)', isText = false }: StatCardProps) {
  const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
  const percentage = maxValue ? Math.min((numValue / maxValue) * 100, 100) : 0;
  const shouldShowProgress = !isText && maxValue && maxValue > 0;

  return (
    <div className="group relative bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-xl hover:border-[color:var(--accent)]/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Fondo decorativo con gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Barra de progreso inferior si hay maxValue */}
      {shouldShowProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[color:var(--muted)]">
          <div 
            className="h-full bg-gradient-to-r from-[color:var(--accent)] to-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          {/* Ícono primero en móvil */}
          <div className="flex-shrink-0 order-first sm:order-last">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--accent)]/5 rounded-xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg">
              {icon}
            </div>
          </div>
          
          {/* Contenido de texto */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)] mb-1.5 sm:mb-2 truncate">{title}</p>
            <div className="flex items-baseline gap-1.5 sm:gap-2 overflow-hidden">
              <h3 className={`font-bold bg-gradient-to-br from-[color:var(--foreground)] to-[color:var(--foreground)]/70 bg-clip-text text-transparent leading-tight ${
                isText ? 'text-sm sm:text-lg lg:text-xl break-words' : 'text-xl sm:text-2xl lg:text-3xl'
              }`} style={{ wordBreak: 'break-word' }}>
                {value}
              </h3>
              {shouldShowProgress && (
                <span className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] whitespace-nowrap flex-shrink-0">/ {maxValue}</span>
              )}
            </div>
          </div>
        </div>

        {description && (
          <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] font-medium mb-2 sm:mb-3 line-clamp-1">
            {description}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-2 pt-2 sm:pt-3 border-t border-[color:var(--border)]">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold ${
              trend.isPositive 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              <span className="text-xs sm:text-sm">{trend.isPositive ? '↗' : '↘'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <span className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] truncate">vs. mes anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}