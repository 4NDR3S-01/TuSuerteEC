import type { ReactNode } from "react";

import { AnnouncementBar } from "../../components/home/announcement-bar";
import { SiteFooter } from "../../components/layout/site-footer";
import { SiteHeader } from "../../components/layout/site-header";
import { prisma, toPlain } from "../../lib/db";

// La barra de anuncios y las páginas públicas leen la base de datos en cada visita
export const dynamic = "force-dynamic";

type PublicLayoutProps = {
  children: ReactNode;
};

export default async function PublicLayout({ children }: PublicLayoutProps) {
  // Evento en vivo marcado como alerta (solo uno a la vez)
  const alertEvent = await prisma.live_events.findFirst({
    where: { show_as_alert: true, is_visible: true, status: { in: ['scheduled', 'live'] } },
    select: { id: true, title: true, description: true, start_at: true, stream_url: true, status: true, countdown_start_at: true },
    orderBy: { start_at: 'asc' },
  });

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <AnnouncementBar event={alertEvent ? toPlain(alertEvent) : null} />
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
