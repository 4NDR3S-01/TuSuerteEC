import { HeroSection } from "../../components/home/hero-section";
import { FaqAccordion } from "../../components/home/faq-accordion";
import { PlansSection } from "../../components/home/plans-section";
import { RafflesShowcase } from "../../components/home/raffles-showcase";
import { WinnersShowcase } from "../../components/home/winners-showcase";
import { SiteHeader } from "../../components/layout/site-header";
import { PUBLIC_NAV_ITEMS } from "../../config/navigation";

const FAQS = [
  {
    question: "¿Cómo puedo iniciar sesión?",
    answer:
      "Haz clic en el botón 'Iniciar sesión' en la parte superior derecha. Ingresa tu correo y contraseña para acceder a tu cuenta. Si olvidaste tu contraseña, utiliza la opción de recuperación. Si aún no tienes una cuenta, regístrate gratis.",
  },
  {
    question: "¿Que pasa si olvido mi contraseña?",
    answer:
      "Puedes hacer clic en 'Olvidé mi contraseña' en la pantalla de inicio de sesión. Se te enviará un correo electrónico con instrucciones para restablecerla.",
  },
  {
    question: "¿Cómo puedo crear una cuenta?",
    answer:
      "Haz clic en 'Registrarse' en la pantalla de inicio de sesión. Completa el formulario con tu información y sigue las instrucciones para verificar tu correo electrónico.",
  },
  {
    question: "¿Cómo garantizan la transparencia del sorteo?",
    answer:
      "Cada sorteo se ejecuta con un algoritmo auditado y almacenamos el acta firmada. Apenas sean publicados los resultados en nuestras redes sociales, la página se refresca con los datos oficiales.",
  },
  {
    question: "¿Que pasa si gano?",
    answer:
      "Si ganas, recibirás un correo electrónico con la confirmación de tu premio y los siguientes pasos a seguir. Asegúrate de revisar tu bandeja de entrada y seguir las instrucciones proporcionadas.",
  },
  {
    question: "¿Puedo participar en múltiples sorteos?",
    answer:
      "Sí, puedes participar en tantos sorteos como desees, siempre y cuando cumplas con los requisitos específicos de cada uno.",
  },

] as const;

const SUPPORT_CHANNELS = [
  {
    title: "Redes sociales",
    description:
      "Resolvemos dudas y compartimos novedades en Instagram. Envíanos un mensaje directo para una respuesta rápida.",
    href: "https://www.instagram.com/tusuerte",
    label: "Abrir Instagram",
    icon: "🌐",
  },
  {
    title: "Línea telefónica",
    description:
      "Atención humana de lunes a viernes de 9h00 a 18h00. Marca y te guiaremos paso a paso.",
    href: "tel:+593963924479",
    label: "Llamar al soporte",
    icon: "📞",
  },
  {
    title: "Correo electrónico",
    description:
      "Para casos detallados o seguimiento de premios, escríbenos y te responderemos en menos de 24 horas.",
    href: "mailto:soporte@tusuerte.com",
    label: "Enviar correo",
    icon: "✉️",
  },
] as const;

export default function HomePage() {
  return (
    <div className="bg-[color:var(--background)] text-[color:var(--foreground)]">
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />

      <main className="mx-auto flex w-full min-h-screen max-w-6xl flex-col gap-16 px-4 pb-20 pt-14 text-base sm:px-6 sm:pb-24 sm:pt-16 md:gap-24 md:px-10">
        <HeroSection />

        <RafflesShowcase
          kicker="Sorteos disponibles"
          title="Participa por premios increíbles"
          description="Explora nuestros sorteos activos y participa para ganar premios emocionantes. Cada sorteo es transparente y seguro, garantizando una experiencia justa para todos los participantes. ¡No pierdas la oportunidad de ser nuestro próximo ganador! Revisa los detalles y participa ahora. ¡Buena suerte!"
        />
        <PlansSection />
        <WinnersShowcase
          kicker="Historias reales"
          title="Ganadores confirmados en TuSuerte"
          description="Cada vez que cierres un sorteo, el panel actualizará este módulo en segundos con los datos oficiales. Los visitantes podrán revisar las historias y validar la transparencia de la plataforma."
        />

        <section id="ayuda" className="scroll-mt-header space-y-10">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                  Ayuda y soporte
                </span>
                <h2 className="text-3xl font-semibold md:text-4xl">Resolvemos tus dudas al instante</h2>
                <p className="text-[color:var(--muted-foreground)]">
                  Nuestro equipo de soporte está disponible para ayudarte con cualquier consulta o problema que puedas tener. Nos comprometemos a brindarte una atención rápida y efectiva para que tu experiencia con TuSuerte sea siempre positiva.
                </p>
              </div>
              <FaqAccordion items={FAQS} />
            </div>
            <aside className="flex w-full flex-col gap-6 self-start rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Canales de soporte</h3>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Elige el canal que prefieras y responde un especialista. Diferenciamos atención urgente, consultas generales y seguimiento de premios.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {SUPPORT_CHANNELS.map((channel) => (
                  <article
                    key={channel.title}
                    className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]/85 p-4 transition-transform hover:-translate-y-1 hover:shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(249,115,22,0.12)] text-base">
                        {channel.icon}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">{channel.title}</p>
                        <p className="text-xs text-[color:var(--muted-foreground)]">{channel.description}</p>
                      </div>
                    </div>
                    <a
                      href={channel.href}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                    >
                      {channel.label}
                      <span aria-hidden="true">↗</span>
                    </a>
                  </article>
                ))}
              </div>
            </aside>
          </div>

          <div className="grid gap-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                Redes sociales
              </p>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Síguenos para conocer lanzamientos, sorteos y transmisiones en vivo. Respondemos mensajes directos en minutos.
              </p>
              <div className="grid gap-2 text-sm sm:max-w-xs">
                <a href="https://www.instagram.com/tusuerte" className="inline-flex items-center justify-between rounded-2xl border border-[color:var(--border)] px-4 py-3 font-semibold text-[color:var(--accent)] hover:-translate-y-0.5 transition-transform">
                  Instagram <span aria-hidden="true">↗</span>
                </a>
                <a href="https://www.facebook.com/tusuerte" className="inline-flex items-center justify-between rounded-2xl border border-[color:var(--border)] px-4 py-3 font-semibold text-[color:var(--accent)] hover:-translate-y-0.5 transition-transform">
                  Facebook <span aria-hidden="true">↗</span>
                </a>
                <a href="https://www.tiktok.com/@tusuerte" className="inline-flex items-center justify-between rounded-2xl border border-[color:var(--border)] px-4 py-3 font-semibold text-[color:var(--accent)] hover:-translate-y-0.5 transition-transform">
                  TikTok <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-[color:var(--border)] bg-[rgba(249,115,22,0.08)] px-4 py-5 text-sm text-[color:var(--muted-foreground)]">
              <div>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">¿Tienes un caso urgente?</p>
                <p className="mt-1 text-xs">
                  Nuestro equipo de soporte responde en menos de 15 minutos a los correos marcados como “urgentes”. También puedes llamarnos directamente.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="tel:+593963924479"
                  className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition-transform hover:-translate-y-0.5"
                >
                  Llamar ahora
                </a>
                <a
                  href="mailto:soporte@tusuerte.com"
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--accent-foreground)] transition-transform hover:-translate-y-0.5"
                >
                  Escribir a soporte
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="sobre-nosotros"
          className="scroll-mt-header space-y-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-8"
        >
          <div className="space-y-3">
            <span className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
              Sobre nosotros
            </span>
            <h2 className="text-3xl font-semibold md:text-4xl">Nuestra historia</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <p className="text-[color:var(--muted-foreground)]">
              TuSuerte nació para transformar sorteos tradicionales en experiencias digitales que
              enamoran. Combinamos storytelling, data y automatización para que cada sorteo sea
              memorable, transparente y escalable. Nuestro equipo multidisciplinario trabaja
              incansablemente para ofrecer una plataforma robusta, intuitiva y segura, donde
              participantes se conectan a través de la emoción de ganar. Más que sorteos,
              creamos momentos que inspiran y unen a las personas.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold">Compromiso con la transparencia</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Nos tomamos muy en serio la confianza. Cada sorteo se realiza con un algoritmo
                  auditado y almacenamos actas firmadas. La transparencia es la base de nuestra
                  relación con usuarios y clientes.
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold">Tecnología confiable y escalable</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Construida sobre Tecnología de vanguardia, nuestra plataforma garantiza velocidad,
                  seguridad y escalabilidad. Ya sea un sorteo pequeño o una campaña masiva, TuSuerte
                  está preparada para crecer contigo.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:rgba(249,115,22,0.08)] p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                ¿Listo para participar en los sorteos?
              </p>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                Crea tu cuenta en minutos y empieza a ganar premios increíbles con TuSuerte.
              </p>
            </div>
            <a
              href="/iniciar-sesion"
              className="rounded-full px-5 py-2 text-sm font-semibold shadow-lg shadow-[color:rgba(249,115,22,0.35)] transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Participar ahora
            </a>
          </div>
        </section>
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
