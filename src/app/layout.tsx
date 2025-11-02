import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "../components/theme/theme-provider";
import { AuthProvider } from "../components/auth/auth-provider";
import { ToastProvider } from "../components/ui/toast-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TuSuerte",
  description: "Participa por muchos premios",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function () {
      try {
        var storageKey = 'theme-preference';
        var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        var stored = window.localStorage.getItem(storageKey);
        var mode = stored === 'light' || stored === 'dark'
          ? stored
          : (mediaQuery.matches ? 'dark' : 'light');
        var root = document.documentElement;
        root.dataset.theme = mode;
        root.dataset.themeMode = mode;
        root.style.setProperty('color-scheme', mode);
      } catch (error) {
        // noop
      }
    })();
  `.trim();

  return (
    <html lang="es" data-theme="light" data-theme-mode="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`app-shell ${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
