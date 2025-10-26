'use client';

import Link from 'next/link';

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
        <div className="text-8xl">⚠️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[color:var(--foreground)]">{title}</h1>
          <p className="text-[color:var(--muted-foreground)]">{message}</p>
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[color:var(--accent)] to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            {action.label}
          </Link>
        )}
        <Link
          href="/app"
          className="block text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--accent)] transition-colors"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
