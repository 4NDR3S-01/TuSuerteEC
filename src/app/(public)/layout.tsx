import type { ReactNode } from "react";

import { AnnouncementBar } from "../../components/home/announcement-bar";
import { getSupabaseServerClient } from "../../lib/supabase/server";

type PublicLayoutProps = {
  children: ReactNode;
};

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const supabase = await getSupabaseServerClient();
  
  // Obtener evento activo como alerta (solo uno a la vez)
  const { data: alertEvent } = await supabase
    .from('live_events')
    .select('id, title, description, start_at, stream_url, status, countdown_start_at')
    .eq('show_as_alert', true)
    .eq('is_visible', true)
    .in('status', ['scheduled', 'live'])
    .order('start_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <AnnouncementBar event={alertEvent} />
      {children}
    </>
  );
}
