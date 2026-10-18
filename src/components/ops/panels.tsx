'use client';

import type { ReactNode } from 'react';
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Gem,
  Gift,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Radio,
  Receipt,
  ScrollText,
  Trophy,
  Users,
} from 'lucide-react';
import { CreditCard as PlanIcon, Home, Settings, Ticket, UserPlus } from 'lucide-react';
import { OpsShell, type OpsNavGroup } from './ops-shell';
import { NotificationsBell } from '../notifications/notifications-bell';
import { useAuthContext } from '../auth/auth-provider';

const ADMIN_NAV: OpsNavGroup[] = [
  { items: [{ href: '/administrador', label: 'Resumen', icon: LayoutDashboard, exact: true }] },
  {
    title: 'Sorteos',
    items: [
      { href: '/administrador/sorteos', label: 'Sorteos', icon: Gift, exact: true },
      { href: '/administrador/sorteos/calendario', label: 'Calendario', icon: CalendarDays },
      { href: '/administrador/ganadores', label: 'Ganadores', icon: Trophy },
      { href: '/administrador/eventos-vivo', label: 'Eventos en vivo', icon: Radio },
    ],
  },
  {
    title: 'Pagos',
    items: [
      { href: '/administrador/pagos/transacciones', label: 'Transacciones', icon: Receipt },
      { href: '/administrador/pagos/metodos', label: 'Métodos de pago', icon: CreditCard },
      { href: '/administrador/planes', label: 'Planes', icon: Gem },
    ],
  },
  {
    title: 'Crecimiento',
    items: [
      { href: '/administrador/marketing', label: 'Descuentos y referidos', icon: Megaphone },
      { href: '/administrador/reportes', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    title: 'Seguridad',
    items: [
      { href: '/administrador/usuarios', label: 'Usuarios', icon: Users },
      { href: '/administrador/auditoria', label: 'Auditoría', icon: ScrollText },
      { href: '/administrador/cuenta', label: 'Mi cuenta', icon: KeyRound },
    ],
  },
];

const STAFF_NAV: OpsNavGroup[] = [
  { items: [{ href: '/staff', label: 'Resumen', icon: LayoutDashboard, exact: true }] },
  {
    title: 'Operación',
    items: [
      { href: '/staff/pagos', label: 'Pagos por revisar', icon: Receipt },
      { href: '/staff/ganadores', label: 'Ganadores', icon: Trophy },
      { href: '/staff/eventos-vivo', label: 'Eventos en vivo', icon: Radio },
      { href: '/staff/sorteos', label: 'Sorteos (consulta)', icon: Gift },
    ],
  },
  { title: 'Cuenta', items: [{ href: '/staff/cuenta', label: 'Mi cuenta', icon: KeyRound }] },
];

const PARTICIPANT_NAV: OpsNavGroup[] = [
  {
    items: [
      { href: '/app', label: 'Inicio', icon: Home, exact: true },
      { href: '/app/sorteos', label: 'Sorteos', icon: Gift },
      { href: '/app/boletos', label: 'Mis boletos y pagos', icon: Ticket },
      { href: '/app/planes', label: 'Planes', icon: PlanIcon },
      { href: '/app/referidos', label: 'Invita y gana', icon: UserPlus },
      { href: '/resultados', label: 'Resultados', icon: Trophy },
    ],
  },
  { title: 'Cuenta', items: [{ href: '/app/settings', label: 'Configuración', icon: Settings }] },
];

type PanelProps = { children: ReactNode; mustChangePassword?: boolean };

export function ParticipantPanel({ children, subscription }: { children: ReactNode; subscription: { planName: string; renewalDate: string } | null }) {
  const { user } = useAuthContext();
  return (
    <OpsShell
      basePath="/app"
      title="Mi cuenta"
      nav={PARTICIPANT_NAV}
      headerActions={user ? <NotificationsBell userId={user.id} /> : null}
      sidebarFooter={
        <div className="mx-3 mb-2 rounded-xl bg-[color:var(--muted)] p-3 text-xs">
          {subscription ? (
            <>
              <p className="font-semibold text-[color:var(--foreground)]">Plan {subscription.planName}</p>
              <p className="text-[color:var(--muted-foreground)]">Vigente hasta el {subscription.renewalDate}</p>
            </>
          ) : (
            <p className="text-[color:var(--muted-foreground)]">Sin plan activo · <a href="/app/planes" className="font-semibold text-[color:var(--accent)]">Ver planes</a></p>
          )}
        </div>
      }
    >
      {children}
    </OpsShell>
  );
}

export function AdminPanel({ children, mustChangePassword }: PanelProps) {
  return (
    <OpsShell basePath="/administrador" title="Administración" nav={ADMIN_NAV} mustChangePassword={mustChangePassword}>
      {children}
    </OpsShell>
  );
}

export function StaffPanel({ children, mustChangePassword }: PanelProps) {
  return (
    <OpsShell basePath="/staff" title="Panel operativo" nav={STAFF_NAV} mustChangePassword={mustChangePassword}>
      {children}
    </OpsShell>
  );
}
