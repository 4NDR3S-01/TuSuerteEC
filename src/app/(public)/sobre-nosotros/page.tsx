import type { Metadata } from "next";
import { Fingerprint, Lock, ReceiptText, Scale, UserCheck, Users } from "lucide-react";

import { ButtonLink, Card, SectionHeader } from "../../../components/ui/kit";
import { SITE } from "../../../config/site";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: "Qué es TuSuerte y cómo funciona: pagos verificados, sorteos con compromiso previo y resultados verificables.",
  alternates: { canonical: "/sobre-nosotros" },
};

const PRINCIPLES = [
  { icon: Fingerprint, title: "Resultados verificables", text: "Publicamos el compromiso de la semilla antes del sorteo y la semilla después. Cualquier persona puede repetir el cálculo." },
  { icon: ReceiptText, title: "Pagos revisados uno a uno", text: "Cada comprobante lo revisa una persona del equipo, que nunca puede aprobar sus propios pagos." },
  { icon: Scale, title: "Condiciones que no empeoran", text: "Cuando un sorteo ya tiene participantes, el sistema impide cambiar el premio, el precio o adelantar las fechas." },
  { icon: UserCheck, title: "Una cuenta por persona", text: "El registro con cédula evita cuentas duplicadas y asegura que el premio llegue a su ganador." },
  { icon: Lock, title: "Privacidad por defecto", text: "Los comprobantes son privados y en los resultados solo aparece el nombre abreviado del ganador." },
  { icon: Users, title: "Registro de auditoría", text: "Aprobaciones, cambios de sorteos y ejecuciones quedan registrados con quién los hizo y cuándo." },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-16 px-4 py-12 sm:px-6">
      <section className="max-w-3xl space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">Sobre nosotros</p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Sorteos en línea que puedes comprobar</h1>
        <p className="text-lg text-[color:var(--muted-foreground)]">
          {SITE.legalName ?? SITE.name} opera una plataforma de sorteos en Ecuador pensada para que participar sea simple y el resultado no dependa de la confianza ciega: las reglas se publican antes y el resultado se puede verificar después.
        </p>
      </section>

      <section className="space-y-8">
        <SectionHeader eyebrow="Cómo trabajamos" title="Lo que garantiza el sistema" description="Estas reglas están implementadas en la plataforma; no son solo una promesa." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((item) => (
            <Card key={item.title} className="p-6">
              <item.icon className="size-6 text-[color:var(--accent)]" aria-hidden />
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card)] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">¿Quieres ver cómo se verifica un sorteo?</h2>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Entra a cualquier resultado y presiona &quot;Verificar en mi navegador&quot;.</p>
        </div>
        <ButtonLink href="/resultados">Ver resultados</ButtonLink>
      </section>
    </div>
  );
}
