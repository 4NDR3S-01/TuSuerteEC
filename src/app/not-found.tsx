import Link from 'next/link';
import { Compass, Home, Ticket } from 'lucide-react';
import { ButtonLink } from '../components/ui/kit';
import { Logo } from '../components/ui/logo';

export default function NotFound() {
  return (
    <main id="contenido" className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Logo />
      <span className="flex size-16 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        <Compass className="size-8" aria-hidden />
      </span>
      <div className="space-y-2">
        <p className="font-mono text-sm text-[color:var(--muted-foreground)]">Error 404</p>
        <h1 className="text-3xl font-extrabold">No encontramos esta página</h1>
        <p className="mx-auto max-w-md text-[color:var(--muted-foreground)]">El enlace puede estar mal escrito o el contenido ya no está disponible.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/"><Home aria-hidden /> Ir al inicio</ButtonLink>
        <ButtonLink href="/sorteos" variant="secondary"><Ticket aria-hidden /> Ver sorteos</ButtonLink>
      </div>
      <Link href="/ayuda" className="text-sm font-semibold text-[color:var(--accent)] hover:underline">¿Necesitas ayuda?</Link>
    </main>
  );
}
