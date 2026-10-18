import Link from 'next/link';
import { ArrowRight, Radio, Receipt, Trophy } from 'lucide-react';
import { requirePagePermission } from '../../../lib/auth/get-user';
import { prisma } from '../../../lib/db';
import { Card, SectionHeader } from '../../../components/ui/kit';

export const dynamic = 'force-dynamic';

export default async function StaffHomePage() {
  const user = await requirePagePermission('staff_panel.access', '/staff');
  const [pendingPayments, pendingWinners, contactedWinners, upcomingEvents] = await Promise.all([
    prisma.payment_transactions.count({ where: { status: 'pending' } }),
    prisma.winners.count({ where: { status: 'pending_contact' } }),
    prisma.winners.count({ where: { status: 'contacted' } }),
    prisma.live_events.count({ where: { status: 'scheduled', start_at: { gt: new Date() } } }),
  ]);

  const tasks = [
    { href: '/staff/pagos', icon: Receipt, title: 'Pagos por revisar', value: pendingPayments, text: 'Verifica cada comprobante contra el estado de cuenta antes de aprobar.' },
    { href: '/staff/ganadores', icon: Trophy, title: 'Ganadores por contactar', value: pendingWinners, text: `${contactedWinners} contactado(s) esperan la entrega del premio.` },
    { href: '/staff/eventos-vivo', icon: Radio, title: 'Eventos programados', value: upcomingEvents, text: 'Transmisiones y avisos que verán los participantes.' },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader as="h1" title={`Hola, ${user.fullName.split(' ')[0]}`} description="Tus tareas de hoy. Las acciones que realizas quedan registradas en la auditoría." />
      <div className="grid gap-5 md:grid-cols-3">
        {tasks.map((task) => (
          <Link key={task.href} href={task.href} className="group">
            <Card className="h-full p-6 transition-colors group-hover:border-[color:var(--accent)]">
              <task.icon className="size-6 text-[color:var(--accent)]" aria-hidden />
              <p className="mt-4 font-display text-3xl font-extrabold tabular-nums">{task.value}</p>
              <p className="font-semibold">{task.title}</p>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{task.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)]">Abrir <ArrowRight className="size-4" aria-hidden /></span>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="p-6 text-sm text-[color:var(--muted-foreground)]">
        <p className="font-semibold text-[color:var(--foreground)]">Buenas prácticas</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Aprueba un pago solo si el monto y la referencia coinciden con tu estado de cuenta.</li>
          <li>No puedes revisar tus propios pagos: el sistema lo impide.</li>
          <li>Si un sorteo ya cerró, rechaza el pago indicando que se hará la devolución.</li>
        </ul>
      </Card>
    </div>
  );
}
