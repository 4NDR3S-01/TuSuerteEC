import { Gift, Tag, UserPlus, Users } from 'lucide-react';
import { requirePageUser } from '../../../../lib/auth/get-user';
import { getMyReferralSummary } from '../../../../lib/actions/marketing';
import { getReferralSettings } from '../../../../lib/settings';
import { formatDate } from '../../../../lib/raffle/labels';
import { ShareButtons } from '../../../../components/raffles/share-buttons';
import { Badge, Card, EmptyState, Notice, SectionHeader } from '../../../../components/ui/kit';

export const dynamic = 'force-dynamic';

export default async function ReferralsPage() {
  await requirePageUser('/app/referidos');
  const [summary, settings] = await Promise.all([getMyReferralSummary(), getReferralSettings()]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <SectionHeader
        as="h1"
        title="Invita y gana"
        description={`Comparte tu enlace. Cuando una persona se registre con él y le aprobemos su primer pago, recibes un código de ${settings.percent}% de descuento.`}
      />

      {!settings.enabled && <Notice tone="warning">El programa de referidos está pausado. Los códigos que ya recibiste siguen siendo válidos hasta su vencimiento.</Notice>}

      <Card className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[color:var(--muted-foreground)]">Tu código</p>
            <p className="font-mono text-2xl font-extrabold tracking-widest">{summary?.code ?? '—'}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-display text-2xl font-extrabold tabular-nums">{summary?.referredCount ?? 0}</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">Personas registradas</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold tabular-nums">{summary?.rewards.length ?? 0}</p>
              <p className="text-xs text-[color:var(--muted-foreground)]">Códigos ganados</p>
            </div>
          </div>
        </div>
        {summary?.link && (
          <>
            <p className="break-all rounded-xl bg-[color:var(--muted)] px-4 py-3 font-mono text-sm">{summary.link}</p>
            <ShareButtons url={summary.link} title="TuSuerte" text="Te invito a TuSuerte, sorteos con resultados verificables. Regístrate con mi enlace:" />
          </>
        )}
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: UserPlus, title: '1. Comparte tu enlace', text: 'Por WhatsApp, redes o como prefieras.' },
          { icon: Users, title: '2. Tu amigo se registra', text: 'Con tu enlace, y realiza su primer pago.' },
          { icon: Gift, title: '3. Recibes tu código', text: `De ${settings.percent}% de descuento, válido ${settings.validityDays} días.` },
        ].map((step) => (
          <Card key={step.title} className="p-5">
            <step.icon className="size-6 text-[color:var(--accent)]" aria-hidden />
            <p className="mt-3 font-semibold">{step.title}</p>
            <p className="text-sm text-[color:var(--muted-foreground)]">{step.text}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Tus códigos de descuento</h2>
        {summary && summary.rewards.length > 0 ? (
          <Card className="divide-y divide-[color:var(--border)]">
            {summary.rewards.map((reward) => {
              const expired = reward.valid_until ? new Date(reward.valid_until) < new Date() : false;
              return (
                <div key={reward.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="flex items-center gap-2 font-mono font-bold"><Tag className="size-4 text-[color:var(--accent)]" aria-hidden /> {reward.code}</p>
                    <p className="text-xs text-[color:var(--muted-foreground)]">{reward.percent}% de descuento · válido hasta el {formatDate(reward.valid_until)}</p>
                  </div>
                  <Badge tone={reward.used ? 'neutral' : expired ? 'danger' : 'success'}>{reward.used ? 'Usado' : expired ? 'Vencido' : 'Disponible'}</Badge>
                </div>
              );
            })}
          </Card>
        ) : (
          <EmptyState icon={Gift} title="Aún no tienes códigos" description="Aparecerán aquí cuando una persona que invitaste complete su primer pago." />
        )}
        <p className="text-xs text-[color:var(--muted-foreground)]">
          Los códigos son personales, de un solo uso y se aplican en el paso de pago de boletos o planes. No se puede referir a la propia cuenta.
        </p>
      </section>
    </div>
  );
}
