import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">{children}</div>;
}
