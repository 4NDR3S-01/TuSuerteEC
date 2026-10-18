import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminPanel } from '../../../components/ops/panels';
import { requirePagePermission } from '../../../lib/auth/get-user';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Administración', robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Cada página y acción vuelve a verificar su permiso específico
  const user = await requirePagePermission('admin_panel.access', '/administrador');
  return <AdminPanel mustChangePassword={user.mustChangePassword}>{children}</AdminPanel>;
}
