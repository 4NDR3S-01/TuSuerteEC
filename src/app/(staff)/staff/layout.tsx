import type { ReactNode } from 'react';
import { StaffSidebar } from '../../../components/staff/staff-sidebar';
import { StaffHeader } from '../../../components/staff/staff-header';

type StaffLayoutProps = {
  children: ReactNode;
};

export default function StaffLayout({ children }: StaffLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      {/* Sidebar */}
      <StaffSidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <StaffHeader />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
