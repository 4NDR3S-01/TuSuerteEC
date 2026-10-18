import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "../components/theme/theme-provider";
import { AuthProvider } from "../components/auth/auth-provider";
import { ToastProvider } from "../components/ui/toast-provider";
import { SITE } from "../config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "TuSuerte · Sorteos en línea transparentes",
    template: "%s · TuSuerte",
  },
  description: SITE.description,
  applicationName: SITE.name,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "es_EC",
    siteName: SITE.name,
    title: "TuSuerte · Sorteos en línea transparentes",
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070b17" },
  ],
};

// Aplica el tema guardado antes de pintar la página (evita el parpadeo claro/oscuro)
const themeScript = `
  (function () {
    try {
      var stored = window.localStorage.getItem('theme-preference');
      var mode = stored === 'light' || stored === 'dark'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var root = document.documentElement;
      root.dataset.theme = mode;
      root.dataset.themeMode = mode;
      root.style.setProperty('color-scheme', mode);
    } catch (error) {}
  })();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-EC" data-theme="light" data-theme-mode="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`app-shell ${inter.variable} ${jakarta.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
