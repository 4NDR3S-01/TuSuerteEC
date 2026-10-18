'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

type ErrorPageProps = {
  title?: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
};

export function ErrorPage({ 
  title = 'Algo salió mal', 
  message,
  action 
}: Readonly<ErrorPageProps>) {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[color:var(--warning-soft)] text-[color:var(--warning)]"><AlertTriangle className="size-8" aria-hidden /></span>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[color:var(--foreground)]">{title}</h1>
          <p className="text-[color:var(--muted-foreground)]">{message}</p>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[color:var(--accent)] text-[color:var(--accent-foreground)] rounded-xl font-bold hover:shadow-lg transition-all"
          >
            {action.label}
          </Link>
        )}
        <Link
          href="/app"
          className="block text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)] transition-colors"
        >
          <span className="inline-flex items-center gap-1"><ArrowLeft className="size-4" aria-hidden /> Volver a mi cuenta</span>
        </Link>
      </div>
    </div>
  );
}
