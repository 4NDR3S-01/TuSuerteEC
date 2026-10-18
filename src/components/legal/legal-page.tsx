import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { LEGAL_NAV_ITEMS } from '../../config/navigation';
import { SITE } from '../../config/site';
import { formatDate } from '../../lib/raffle/labels';
import { Notice } from '../ui/kit';

/** Plantilla común de los documentos legales */
export function LegalPage({ title, intro, current, children }: { title: string; intro: string; current: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Documentos legales" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ul className="flex gap-2 overflow-x-auto text-sm lg:flex-col">
          {LEGAL_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.href === current ? 'page' : undefined}
                className="block whitespace-nowrap rounded-lg px-3 py-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] aria-[current=page]:bg-[color:var(--muted)] aria-[current=page]:font-semibold aria-[current=page]:text-[color:var(--foreground)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose-legal min-w-0 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-[color:var(--foreground)]">{title}</h1>
        <p className="mt-2 text-sm">Última actualización: {formatDate(SITE.legalUpdatedAt)}</p>
        {!SITE.legalReviewed && (
          <Notice tone="warning" icon={AlertTriangle} className="mt-6" title="Documento en revisión">
            Este texto está pendiente de revisión legal y puede cambiar. Ante cualquier duda, contáctanos antes de participar.
          </Notice>
        )}
        <p className="mt-6">{intro}</p>
        {children}
      </article>
    </div>
  );
}

/** Identificación del organizador con los datos configurados (o un texto genérico si faltan) */
export function Organizer() {
  return (
    <>
      <strong>{SITE.legalName ?? SITE.name}</strong>
      {SITE.taxId ? `, con RUC ${SITE.taxId}` : ''}
      {SITE.address ? `, domiciliado en ${SITE.address}` : ''}
    </>
  );
}

export function ContactLine() {
  const { email, phone, whatsapp } = SITE.contact;
  if (!email && !phone && !whatsapp) {
    return <>a través de los canales indicados en el <Link href="/ayuda#contacto">centro de ayuda</Link></>;
  }
  return (
    <>
      {email && <>al correo <a href={`mailto:${email}`}>{email}</a></>}
      {email && (phone || whatsapp) && ' o '}
      {(whatsapp || phone) && <>al teléfono {whatsapp ?? phone}</>}
    </>
  );
}
