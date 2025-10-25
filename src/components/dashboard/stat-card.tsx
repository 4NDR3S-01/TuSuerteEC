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
}

export function StatCard({ title, value, icon, trend, description }: StatCardProps) {
  return (
    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[color:var(--muted-foreground)]">{title}</p>
          <h3 className="text-3xl font-bold text-[color:var(--foreground)] mt-2">{value}</h3>
          {description && (
            <p className="text-xs text-[color:var(--muted-foreground)] mt-1">{description}</p>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="w-12 h-12 bg-[color:var(--accent)]/10 rounded-lg flex items-center justify-center text-[color:var(--accent)]">
            {icon}
          </div>
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">vs. mes anterior</span>
        </div>
      )}
    </div>
  );
}