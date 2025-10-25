import type { ReactNode } from 'react';
import { AdminSidebar } from '../../../components/admin/admin-sidebar';
import { AdminHeader } from '../../../components/admin/admin-header';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <AdminHeader />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
