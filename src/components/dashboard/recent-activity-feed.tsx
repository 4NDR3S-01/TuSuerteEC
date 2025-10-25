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
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    if (diffInDays < 30) return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
    return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)] mb-4">
          Actividad Reciente
        </h2>
        <div className="text-center py-8">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-[color:var(--muted-foreground)] text-sm">No hay actividad reciente</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
          Actividad Reciente
        </h2>
        <span className="text-xs text-[color:var(--muted-foreground)]">
          {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}
        </span>
      </div>

      <div className="space-y-3">
        {displayedActivities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-[color:var(--muted)]/50 border border-[color:var(--border)] hover:bg-[color:var(--muted)] transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center text-xl">
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[color:var(--foreground)] truncate">
                {activity.title}
              </p>
              <p className="text-xs text-[color:var(--muted-foreground)] mt-0.5">
                {activity.description}
              </p>
              <p className="text-xs text-[color:var(--accent)] mt-1">
                {getTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {activities.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-4 py-2 text-sm text-[color:var(--accent)] hover:underline font-medium"
        >
          {isExpanded ? 'Ver menos' : `Ver todas (${activities.length})`}
        </button>
      )}
    </div>
  );
}