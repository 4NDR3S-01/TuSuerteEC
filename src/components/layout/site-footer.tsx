import Link from 'next/link';
import { Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { Logo } from '../ui/logo';
import { LEGAL_NAV_ITEMS } from '../../config/navigation';
import { SITE, instagramUrl, whatsappUrl } from '../../config/site';

export function SiteFooter() {
  const { contact } = SITE;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-[color:var(--muted-foreground)]">{SITE.description}</p>
          <p className="flex items-start gap-2 text-xs text-[color:var(--muted-foreground)]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" aria-hidden />
            Participación exclusiva para mayores de 18 años. Juega con responsabilidad.
          </p>
        </div>

        <nav aria-label="Plataforma" className="space-y-3 text-sm">
          <p className="font-semibold text-[color:var(--foreground)]">Plataforma</p>
          <ul className="space-y-2 text-[color:var(--muted-foreground)]">
            <li><Link className="hover:text-[color:var(--foreground)]" href="/sorteos">Sorteos abiertos</Link></li>
            <li><Link className="hover:text-[color:var(--foreground)]" href="/resultados">Resultados y verificación</Link></li>
            <li><Link className="hover:text-[color:var(--foreground)]" href="/#planes">Planes</Link></li>
            <li><Link className="hover:text-[color:var(--foreground)]" href="/sobre-nosotros">Sobre nosotros</Link></li>
            <li><Link className="hover:text-[color:var(--foreground)]" href="/ayuda">Centro de ayuda</Link></li>
          </ul>
        </nav>

        <nav aria-label="Legal" className="space-y-3 text-sm">
          <p className="font-semibold text-[color:var(--foreground)]">Legal</p>
          <ul className="space-y-2 text-[color:var(--muted-foreground)]">
            {LEGAL_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link className="hover:text-[color:var(--foreground)]" href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 text-sm">
          <p className="font-semibold text-[color:var(--foreground)]">Contacto</p>
          <ul className="space-y-2 text-[color:var(--muted-foreground)]">
            {contact.email && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-[color:var(--foreground)]" href={`mailto:${contact.email}`}>
                  <Mail className="size-4" aria-hidden /> {contact.email}
                </a>
              </li>
            )}
            {contact.whatsapp && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-[color:var(--foreground)]" href={whatsappUrl(contact.whatsapp)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              </li>
            )}
            {contact.phone && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-[color:var(--foreground)]" href={`tel:${contact.phone.replace(/\s/g, '')}`}>
                  <Phone className="size-4" aria-hidden /> {contact.phone}
                </a>
              </li>
            )}
            {contact.instagram && (
              <li>
                <a className="hover:text-[color:var(--foreground)]" href={instagramUrl(contact.instagram)} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
            )}
            {contact.facebook && (
              <li>
                <a className="hover:text-[color:var(--foreground)]" href={contact.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              </li>
            )}
            <li>
              <Link className="hover:text-[color:var(--foreground)]" href="/ayuda#contacto">Más canales de ayuda</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[color:var(--border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-[color:var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {SITE.legalName ?? SITE.name}
            {SITE.taxId ? ` · RUC ${SITE.taxId}` : ''}. Todos los derechos reservados.
          </p>
          {SITE.address && <p>{SITE.address}</p>}
        </div>
      </div>
    </footer>
  );
}
