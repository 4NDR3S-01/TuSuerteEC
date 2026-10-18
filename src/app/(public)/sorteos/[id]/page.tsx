import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Fingerprint, Info, ShieldCheck, Trophy } from "lucide-react";

import { FavoriteButton } from "../../../../components/raffles/favorite-button";
import { RaffleFacts } from "../../../../components/raffles/raffle-facts";
import { ShareButtons } from "../../../../components/raffles/share-buttons";
import { Badge, ButtonLink, Card, Notice } from "../../../../components/ui/kit";
import { SITE } from "../../../../config/site";
import { getCurrentUser } from "../../../../lib/auth/get-user";
import { prisma } from "../../../../lib/db";
import { ENTRY_MODES, RAFFLE_STATUS, formatDateTime, prizeCategory } from "../../../../lib/raffle/labels";
import { getPublicRaffle } from "../../../../lib/queries/public";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const raffle = await getPublicRaffle((await params).id);
  if (!raffle) return { title: "Sorteo no encontrado" };
  return {
    title: raffle.title,
    description: `${raffle.prize_description}. Sorteo el ${formatDateTime(raffle.draw_date)}.`,
    alternates: { canonical: `/sorteos/${raffle.id}` },
    openGraph: {
      title: raffle.title,
      description: raffle.prize_description,
      images: raffle.image_url ? [{ url: raffle.image_url }] : undefined,
    },
  };
}

export default async function PublicRaffleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [raffle, user] = await Promise.all([getPublicRaffle(id), getCurrentUser()]);
  if (!raffle) notFound();

  const favorite = user
    ? Boolean(await prisma.raffle_favorites.findUnique({ where: { user_id_raffle_id: { user_id: user.id, raffle_id: raffle.id } } }))
    : false;

  const category = prizeCategory(raffle.prize_category);
  const status = RAFFLE_STATUS[raffle.status] ?? RAFFLE_STATUS.active;
  const isOpen = raffle.status === "active" && (!raffle.end_date || new Date(raffle.end_date) > new Date());
  const participateHref = `/app/sorteos/${raffle.id}`;
  const shareUrl = `${SITE.url}/sorteos/${raffle.id}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/sorteos" className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]">
        <ArrowLeft className="size-4" aria-hidden /> Todos los sorteos
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)]">
            {raffle.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={raffle.image_url} alt={`Premio: ${raffle.prize_description}`} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center" style={{ background: "var(--hero-gradient)" }}>
                <category.icon className="size-24 text-white/80" strokeWidth={1.25} aria-hidden />
              </div>
            )}
          </div>

          {raffle.description && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">Sobre este sorteo</h2>
              <p className="whitespace-pre-line text-[color:var(--muted-foreground)]">{raffle.description}</p>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-xl font-bold">Condiciones</h2>
            <RaffleFacts raffle={raffle} />
            <ul className="space-y-2 text-sm text-[color:var(--muted-foreground)]">
              <li>• {ENTRY_MODES[raffle.entry_mode]?.description}</li>
              <li>• Los boletos se emiten cuando nuestro equipo verifica el pago. Los pagos en revisión cuentan para el máximo por persona.</li>
              <li>• Si el sorteo cierra antes de aprobar tu pago, te devolvemos el dinero según la <Link href="/reembolsos" className="font-semibold text-[color:var(--accent)] hover:underline">política de reembolsos</Link>.</li>
              <li>• Participación exclusiva para mayores de 18 años con cédula ecuatoriana.</li>
            </ul>
            {raffle.terms && (
              <Card className="p-5">
                <h3 className="font-semibold">Condiciones adicionales de este sorteo</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-[color:var(--muted-foreground)]">{raffle.terms}</p>
              </Card>
            )}
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Este sorteo se rige por las <Link href="/bases" className="font-semibold text-[color:var(--accent)] hover:underline">bases generales</Link> y los{" "}
              <Link href="/terminos" className="font-semibold text-[color:var(--accent)] hover:underline">términos y condiciones</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Fingerprint className="size-5 text-[color:var(--accent)]" aria-hidden /> Cómo se elige al ganador
            </h2>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Al cerrar la participación publicamos la huella de una semilla secreta y la huella de la lista de boletos. En la fecha del sorteo revelamos la semilla y el ganador se calcula con un algoritmo público que puedes repetir en la página de resultados.
            </p>
            {raffle.draw_commitment && (
              <Card className="space-y-2 p-4 font-mono text-xs">
                <p><span className="font-sans font-semibold">Compromiso de la semilla:</span> <span className="break-all">{raffle.draw_commitment}</span></p>
                <p><span className="font-sans font-semibold">Huella de los boletos:</span> <span className="break-all">{raffle.entries_hash}</span></p>
              </Card>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              <Badge tone="neutral"><category.icon aria-hidden /> {category.label}</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{raffle.title}</h1>
              <p className="mt-2 flex items-start gap-2 text-[color:var(--muted-foreground)]">
                <Trophy className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)]" aria-hidden />
                {raffle.prize_description}
              </p>
            </div>

            {isOpen ? (
              raffle.entry_mode === "subscribers_only" ? (
                <div className="space-y-3">
                  <Notice tone="info" icon={Info}>En este sorteo participan automáticamente las personas con un plan activo.</Notice>
                  <ButtonLink href="/app/planes" size="lg" block>Ver planes</ButtonLink>
                </div>
              ) : (
                <div className="space-y-3">
                  <ButtonLink href={participateHref} size="lg" block>
                    Participar ahora <ArrowRight aria-hidden />
                  </ButtonLink>
                  <p className="text-center text-xs text-[color:var(--muted-foreground)]">
                    {user ? "Elige la cantidad de boletos y verás el total antes de pagar." : "Te pediremos iniciar sesión o crear una cuenta gratis."}
                  </p>
                </div>
              )
            ) : raffle.status === "drawn" || raffle.status === "completed" ? (
              <ButtonLink href={`/resultados/${raffle.id}`} size="lg" block>
                Ver resultados y verificar
              </ButtonLink>
            ) : (
              <Notice tone="warning" icon={Info}>
                La participación está cerrada. El sorteo se realizará el {formatDateTime(raffle.draw_date)}.
              </Notice>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-5">
              <p className="text-sm font-semibold">Comparte este sorteo</p>
              {isOpen && <FavoriteButton raffleId={raffle.id} initialFavorite={favorite} isAuthenticated={Boolean(user)} />}
            </div>
            <ShareButtons url={shareUrl} title={raffle.title} />

            <p className="flex items-start gap-2 text-xs text-[color:var(--muted-foreground)]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
              Paga solo con los datos que te mostramos dentro de tu cuenta. Nunca te pediremos pagos por mensajes privados.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
