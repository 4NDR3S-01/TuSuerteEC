'use client';

import { useState } from 'react';

interface ActivityItem {
  readonly id: string;
  readonly type: 'entry' | 'win' | 'subscription';
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
  readonly icon: string;
}

interface RecentActivityFeedProps {
  readonly activities: ActivityItem[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedActivities = isExpanded ? activities : activities.slice(0, 5);

  const getTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Justo ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    if (diffInDays < 30) return `Hace ${Math.floor(diffInDays / 7)}sem`;
    return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
  };

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'win':
        return 'from-yellow-500 to-orange-500';
      case 'entry':
        return 'from-blue-500 to-cyan-500';
      case 'subscription':
        return 'from-purple-500 to-pink-500';
      default:
        return 'from-[color:var(--accent)] to-orange-500';
    }
  };

  const getActivityBadge = (type: string): { text: string; color: string } => {
    switch (type) {
      case 'win':
        return { text: 'GANASTE', color: 'bg-yellow-500' };
      case 'entry':
        return { text: 'PARTICIPACIÓN', color: 'bg-blue-500' };
      case 'subscription':
        return { text: 'SUSCRIPCIÓN', color: 'bg-purple-500' };
      default:
        return { text: 'ACTIVIDAD', color: 'bg-gray-500' };
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="group relative bg-[color:var(--card)] border-2 border-dashed border-[color:var(--border)] rounded-2xl p-8 hover:border-[color:var(--accent)]/50 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <span>Actividad Reciente</span>
            </h2>
            <span className="px-3 py-1 bg-[color:var(--muted)] text-[color:var(--muted-foreground)] text-xs font-semibold rounded-full">
              0 Actividades
            </span>
          </div>
          
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
              Sin Actividad Reciente
            </h3>
            <p className="text-[color:var(--muted-foreground)] text-sm">
              Tu actividad aparecerá aquí
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[color:var(--foreground)] flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <span>Actividad Reciente</span>
        </h2>
        <span className="px-3 py-1 bg-[color:var(--accent)]/10 text-[color:var(--accent)] text-xs font-bold rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[color:var(--accent)] rounded-full animate-pulse" />
          {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative space-y-3 sm:space-y-4">
        {/* Línea vertical del timeline */}
        <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[color:var(--accent)] via-[color:var(--border)] to-transparent" />

        {displayedActivities.map((activity, index) => {
          const badge = getActivityBadge(activity.type);
          const isRecent = new Date().getTime() - new Date(activity.timestamp).getTime() < 3600000; // Última hora
          
          return (
            <div
              key={activity.id}
              className="group relative flex items-start gap-3 sm:gap-4 transition-all duration-300"
            >
              {/* Punto del timeline con animación */}
              <div className="relative flex-shrink-0 z-10">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${getActivityColor(activity.type)} flex items-center justify-center text-base sm:text-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {activity.icon}
                </div>
                
                {/* Anillo de resplandor para actividades recientes */}
                {isRecent && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)] to-orange-500 rounded-lg sm:rounded-xl blur-md animate-pulse -z-10" />
                )}

                {/* Indicador de nueva actividad */}
                {isRecent && (
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full border-2 border-[color:var(--card)] animate-bounce" />
                )}
              </div>

              {/* Contenido de la actividad */}
              <div className="flex-1 min-w-0 bg-[color:var(--muted)]/30 border border-[color:var(--border)] rounded-lg sm:rounded-xl p-3 sm:p-4 group-hover:bg-[color:var(--muted)]/60 group-hover:border-[color:var(--accent)]/30 transition-all duration-300">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-[color:var(--foreground)] line-clamp-2 group-hover:text-[color:var(--accent)] transition-colors">
                      {activity.title}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[color:var(--muted-foreground)] mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  </div>

                  {/* Badge del tipo de actividad */}
                  <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 ${badge.color} text-white text-[9px] sm:text-[10px] font-black rounded-md shadow whitespace-nowrap`}>
                    <span className="hidden xs:inline">{badge.text}</span>
                    <span className="xs:hidden">{badge.text.slice(0, 3)}</span>
                  </span>
                </div>

                {/* Timestamp y detalles adicionales */}
                <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[color:var(--border)]/50">
                  <span className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold text-[color:var(--accent)]">
                    <span className="text-xs sm:text-sm">🕐</span>
                    <span>{getTimeAgo(activity.timestamp)}</span>
                  </span>

                  {/* Indicador de actividad reciente */}
                  {isRecent && (
                    <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] sm:text-[10px] font-bold rounded-full whitespace-nowrap">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="hidden xs:inline">NUEVO</span>
                      <span className="xs:hidden">•</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón de expandir/contraer */}
      {activities.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group w-full mt-6 py-3 px-4 bg-gradient-to-r from-[color:var(--accent)]/5 to-orange-500/5 hover:from-[color:var(--accent)]/10 hover:to-orange-500/10 border border-[color:var(--border)] rounded-xl text-sm font-bold text-[color:var(--accent)] transition-all duration-300 flex items-center justify-center gap-2"
        >
          <span>{isExpanded ? 'Ver menos' : `Ver todas las actividades (${activities.length})`}</span>
          <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            ↓
          </span>
        </button>
      )}
    </div>
  );
}