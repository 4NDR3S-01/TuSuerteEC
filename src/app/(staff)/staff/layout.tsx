import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { StaffPanel } from '../../../components/ops/panels';
import { requirePagePermission } from '../../../lib/auth/get-user';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Panel operativo', robots: { index: false } };

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requirePagePermission('staff_panel.access', '/staff');
  return <StaffPanel mustChangePassword={user.mustChangePassword}>{children}</StaffPanel>;
}
