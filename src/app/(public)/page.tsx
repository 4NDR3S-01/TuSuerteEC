import { HeroSection } from "../../components/home/hero-section";
import { FaqAccordion } from "../../components/home/faq-accordion";
// SUPPORT_CHANNELS removed from home to avoid unused import
import { PlansSection } from "../../components/home/plans-section";
import { RafflesShowcase } from "../../components/home/raffles-showcase";
import { RecentWinnersShowcase } from "../../components/home/recent-winners-showcase";
import { SiteHeader } from "../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../config/navigation";
import { getSupabaseServerClient } from "../../lib/supabase/server";

// FAQS and SUPPORT_CHANNELS are imported from `src/config/help` to avoid duplication

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  
  // Obtener planes activos
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  // Obtener sorteos activos
  const { data: activeRaffles } = await supabase
    .from('raffles')
    .select('id, title, description, prize_description, prize_category, image_url, start_date, end_date, draw_date, status, entry_mode, is_trending')
    .eq('status', 'active')
    .order('is_trending', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6);

  // Obtener ganadores con fotos de entrega del último mes
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  // Primero obtener el conteo total de ganadores que cumplen filtros
  const { data: _countData, error: countError, count: totalWinnersCount } = await supabase
    .from('winners')
    .select('id', { count: 'exact' })
    .eq('status', 'prize_delivered')
    .not('delivery_photo_url', 'is', null)
    .gte('delivered_at', oneMonthAgo.toISOString());

  if (countError) {
    console.error('Error fetching winners count:', countError);
  }

  // Luego obtener los últimos ganadores limitados para el carrusel
  const winnersResponse = await supabase
    .from('winners')
    .select('id, prize_position, delivered_at, testimonial, delivery_photo_url, user_id, raffle_id')
    .eq('status', 'prize_delivered')
    .not('delivery_photo_url', 'is', null)
    .gte('delivered_at', oneMonthAgo.toISOString())
    .order('delivered_at', { ascending: false })
    .limit(24); // Mostrar solo los últimos 24 en el carrusel

  console.log('Winners response:', {
    data: winnersResponse.data,
    error: winnersResponse.error,
    count: winnersResponse.data?.length,
    totalWinnersCount,
  });

  const winnersData = winnersResponse.data || [];
  let deliveredWinners: any[] = [];

  if (winnersData.length > 0) {
    // Obtener IDs únicos para consultas adicionales
    const winnerUserIds = [...new Set(winnersData.map(w => w.user_id))];
    const winnerRaffleIds = [...new Set(winnersData.map(w => w.raffle_id))];

    // Consultar perfiles de ganadores
    const { data: winnerProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', winnerUserIds);

    // Consultar sorteos de ganadores (incluye prize_description)
    const { data: winnerRaffles } = await supabase
      .from('raffles')
      .select('id, title, prize_description')
      .in('id', winnerRaffleIds);

    // Crear mapas para búsqueda rápida
    const profilesMap = new Map((winnerProfiles || []).map(p => [p.id, p]));
    const rafflesMap = new Map((winnerRaffles || []).map(r => [r.id, r]));

    // Combinar datos
    deliveredWinners = winnersData.map(w => {
      const raffle = rafflesMap.get(w.raffle_id);
      return {
        ...w,
        prize_description: raffle?.prize_description || 'Premio',
        profiles: profilesMap.get(w.user_id) || { full_name: 'Ganador', avatar_url: null },
        raffles: raffle ? { title: raffle.title } : { title: 'Sorteo' }
      };
    });

    console.log('Delivered winners final:', deliveredWinners);
  }

  return (
    <div className="bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />

      <main className="mx-auto flex w-full min-h-screen max-w-6xl flex-col gap-16 px-4 pb-20 pt-14 text-base sm:px-6 sm:pb-24 sm:pt-16 md:gap-24 md:px-10">
        <HeroSection />

        <RafflesShowcase
          kicker="Sorteos disponibles"
          title="Participa por premios increíbles"
          description="Explora nuestros sorteos activos y participa para ganar premios emocionantes. Cada sorteo es transparente y seguro, garantizando una experiencia justa para todos los participantes. ¡No pierdas la oportunidad de ser nuestro próximo ganador! Revisa los detalles y participa ahora. ¡Buena suerte!"
          raffles={activeRaffles || []}
        />
        
        <PlansSection plans={plans || []} />
        
        {/* Ganadores con fotos de entrega */}
        {deliveredWinners && deliveredWinners.length > 0 && (
          <RecentWinnersShowcase winners={deliveredWinners} totalCount={totalWinnersCount ?? deliveredWinners.length} />
        )}

        {/* Ayuda y Sobre nosotros movidos a páginas dedicadas */}
      </main>

      <footer className="border-t border-[color:var(--border)] bg-[color:var(--muted)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-[color:var(--muted-foreground)] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TuSuerte. Todos los derechos reservados.</p>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-[color:var(--accent)]" href="https://www.instagram.com/andres.cabrera20/">
              Desarrollado con ❤️ por William Cabrera
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
