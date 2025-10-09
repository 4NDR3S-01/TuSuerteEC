import { HeroSection } from "../../components/home/hero-section";
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

export default function HomePage() {
  return (
    <div style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <SiteHeader navItems={PUBLIC_NAV_ITEMS} />

      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-4 pb-20 pt-14 text-base sm:px-6 sm:pb-24 sm:pt-16 md:gap-24 md:px-10">
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

        <section id="ayuda" className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
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
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              {FAQS.map((faq) => (
                <article
                  key={faq.question}
                  className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 transition-transform hover:-translate-y-1 hover:shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)] sm:p-5"
                >
                  <h3 className="text-base font-semibold text-[color:var(--foreground)] sm:text-lg">
                    {faq.question}
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
                  Redes sociales
                </p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Síguenos en nuestras cuentas oficiales para estar al día con las últimas noticias, promociones y sorteos.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <a href="https://www.facebook.com/tusuerte" className="font-semibold text-[color:var(--accent)]">
                    Facebook &#8599;
                  </a>
                  <a href="https://www.instagram.com/tusuerte" className="font-semibold text-[color:var(--accent)]">
                    Instagram &#8599;
                  </a>
                  <a href="https://www.tiktok.com/@tusuerte" className="font-semibold text-[color:var(--accent)]">
                    TikTok &#8599;
                  </a>
                </div>
              </div>
            </div>
          </div>
          <aside className="space-y-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-6">
            <h3 className="text-lg font-semibold">Canales de soporte</h3>
            <ul className="space-y-4 text-sm text-[color:var(--muted-foreground)]">
              <li>
                <strong className="text-[color:var(--foreground)]">Redes sociales:</strong> Te puedes comunicar con nosotros por medio de nuestras cuentas oficiales que se encuentran en la sección de "Redes sociales".
              </li>
              <li>
                <strong className="text-[color:var(--foreground)]">Línea telefónica:</strong> Podras contactarte con nuestro equipo de soporte al <a href="tel:+593963924479">+593 963924479</a>.
              </li>
              <li>
                <strong className="text-[color:var(--foreground)]">Correo electronico:</strong> Contacte con nuestro equipo a través de <a href="mailto:soporte@tusuerte.com">soporte@tusuerte.com</a>.
              </li>
            </ul>
            <a
              href="mailto:soporte@tusuerte.com"
              className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Escribir a soporte
            </a>
          </aside>
        </section>

        <section
          id="sobre-nosotros"
          className="space-y-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--muted)] p-8"
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
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-[color:var(--muted-foreground)] md:flex-row md:items-center md:justify-between">
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
