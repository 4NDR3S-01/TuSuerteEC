import Link from 'next/link';
export const dynamic = 'force-dynamic';

import { requireRole } from '../../../lib/auth/get-user';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { StaffDashboard } from '../../../components/staff/staff-dashboard';


export default async function StaffHomePage() {
  await requireRole('staff');

  const supabase = await getSupabaseServerClient();

  // Métricas básicas para staff
  const [
    { count: activeSorteos },
    { count: pendingWinners },
    { count: upcomingEvents },
  ] = await Promise.all([
    supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('winners').select('*', { count: 'exact', head: true }).eq('status', 'pending_contact'),
    supabase.from('live_events').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-foreground)]">
              Panel Operativo
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[color:var(--foreground)]">
              Gestión de Sorteos y Eventos
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-[color:var(--muted-foreground)]">
              Como parte del equipo operativo, tienes acceso a ejecutar sorteos, gestionar eventos en vivo
              y realizar seguimiento de ganadores. Tu trabajo garantiza la transparencia del sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            <div>
              <p className="text-3xl font-bold text-[color:var(--foreground)]">{activeSorteos || 0}</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">Sorteos activos</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-3xl font-bold text-[color:var(--foreground)]">{pendingWinners || 0}</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">Ganadores pendientes</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎬</span>
            <div>
              <p className="text-3xl font-bold text-[color:var(--foreground)]">{upcomingEvents || 0}</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">Eventos programados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-8">
        <h2 className="text-xl font-bold text-[color:var(--foreground)]">Acciones rápidas</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Tareas operativas del día a día
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/staff/sorteos/ejecutar"
            className="group flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-4 transition-transform hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_40px_-20px_rgba(249,115,22,0.35)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10 text-lg text-[color:var(--accent)] transition-transform group-hover:scale-105">
              🎲
            </span>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Ejecutar sorteo</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">Sortear ganadores ahora</p>
          </Link>

          <Link
            href="/staff/eventos-vivo"
            className="group flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-4 transition-transform hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_40px_-20px_rgba(249,115,22,0.35)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10 text-lg text-[color:var(--accent)] transition-transform group-hover:scale-105">
              📡
            </span>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Gestionar evento</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">Transmisiones en vivo</p>
          </Link>

          <Link
            href="/staff/ganadores"
            className="group flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-4 transition-transform hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_40px_-20px_rgba(249,115,22,0.35)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10 text-lg text-[color:var(--accent)] transition-transform group-hover:scale-105">
              📞
            </span>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Contactar ganador</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">Seguimiento de premios</p>
          </Link>

          <Link
            href="/staff/sorteos"
            className="group flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/70 p-4 transition-transform hover:-translate-y-1 hover:border-[color:var(--accent)] hover:shadow-[0_20px_40px_-20px_rgba(249,115,22,0.35)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--accent)]/10 text-lg text-[color:var(--accent)] transition-transform group-hover:scale-105">
              📋
            </span>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Ver sorteos</p>
            <p className="text-xs text-[color:var(--muted-foreground)]">Lista completa</p>
          </Link>
        </div>
      </div>

      {/* Info de permisos */}
      <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-blue-500/5 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Permisos de Staff</p>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              Tienes acceso a <strong>Sorteos</strong>, <strong>Eventos en vivo</strong> y{' '}
              <strong>Ganadores</strong>. Para cambios de configuración, planes o usuarios, contacta
              al administrador principal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}