import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Mail, MessageCircle, Phone, Scale, ShieldCheck } from "lucide-react";

import FaqSearch from "../../../components/help/faq-search";
import { Card, Notice, SectionHeader } from "../../../components/ui/kit";
import { FAQS } from "../../../config/help";
import { SITE, hasAnyContact, instagramUrl, whatsappUrl } from "../../../config/site";

export const metadata: Metadata = {
  title: "Centro de ayuda",
  description: "Respuestas sobre cómo participar, pagos, verificación de resultados y entrega de premios en TuSuerte.",
  alternates: { canonical: "/ayuda" },
};

export default function HelpPage() {
  const { contact } = SITE;
  const channels = [
    contact.whatsapp && { icon: MessageCircle, title: "WhatsApp", detail: contact.whatsapp, href: whatsappUrl(contact.whatsapp, "Hola, necesito ayuda con TuSuerte"), external: true },
    contact.email && { icon: Mail, title: "Correo", detail: contact.email, href: `mailto:${contact.email}`, external: false },
    contact.phone && { icon: Phone, title: "Teléfono", detail: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}`, external: false },
    contact.instagram && { icon: MessageCircle, title: "Instagram", detail: contact.instagram, href: instagramUrl(contact.instagram), external: true },
  ].filter(Boolean) as Array<{ icon: typeof Mail; title: string; detail: string; href: string; external: boolean }>;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-16 px-4 py-12 sm:px-6">
      <SectionHeader as="h1" eyebrow="Centro de ayuda" title="¿En qué te ayudamos?" description="Encuentra respuestas rápidas o escríbenos." />

      <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
        <section aria-labelledby="faq-title" className="space-y-4">
          <h2 id="faq-title" className="text-xl font-bold">Preguntas frecuentes</h2>
          <FaqSearch entries={FAQS} />
        </section>

        <aside className="space-y-4">
          <h2 className="text-xl font-bold">Documentos</h2>
          <Card className="divide-y divide-[color:var(--border)]">
            {[
              { href: "/bases", label: "Bases de los sorteos", icon: Scale },
              { href: "/terminos", label: "Términos y condiciones", icon: FileText },
              { href: "/privacidad", label: "Política de privacidad", icon: ShieldCheck },
              { href: "/reembolsos", label: "Política de reembolsos", icon: FileText },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 text-sm font-medium hover:bg-[color:var(--muted)]/60">
                <item.icon className="size-4 text-[color:var(--accent)]" aria-hidden /> {item.label}
              </Link>
            ))}
          </Card>
        </aside>
      </div>

      <section id="contacto" className="scroll-mt-header space-y-6">
        <SectionHeader eyebrow="Contacto" title="Habla con nosotros" description={contact.hours ? `Horario de atención: ${contact.hours}.` : undefined} />
        {hasAnyContact() ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {channels.map((channel) => (
              <a
                key={channel.title}
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-[var(--shadow-card)] transition-colors hover:border-[color:var(--accent)]"
              >
                <channel.icon className="size-6 text-[color:var(--accent)]" aria-hidden />
                <p className="mt-3 font-semibold">{channel.title}</p>
                <p className="break-all text-sm text-[color:var(--muted-foreground)]">{channel.detail}</p>
              </a>
            ))}
          </div>
        ) : (
          <Notice tone="neutral">Estamos habilitando nuestros canales de atención. Si ya tienes cuenta, revisa tus avisos dentro de la app.</Notice>
        )}
        <Notice tone="warning" icon={ShieldCheck} title="Cuidado con las estafas">
          Solo pagamos premios y recibimos pagos a través de esta plataforma. Nunca te pediremos dinero para &quot;liberar&quot; un premio ni datos de tus tarjetas.
        </Notice>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
