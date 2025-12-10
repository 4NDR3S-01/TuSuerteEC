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

  const errorSuppressionScript = `
    (function () {
      // Suprimir errores no críticos de cookies y streams
      if (typeof window !== 'undefined') {
        // Suprimir errores de cookies de Cloudflare
        var originalConsoleError = console.error;
        console.error = function() {
          var args = Array.prototype.slice.call(arguments);
          var message = args.join(' ');
          
          // Filtrar errores no críticos
          if (message && (
            message.includes('__cf_bm') ||
            (message.includes('Cookie') && message.includes('rejected') && message.includes('domain')) ||
            message.includes('Error in input stream') ||
            message.includes('input stream')
          )) {
            return; // No mostrar estos errores
          }
          originalConsoleError.apply(console, args);
        };

        // Capturar errores no manejados relacionados con cookies/streams
        window.addEventListener('error', function(event) {
          var message = event.message || '';
          if (message.includes('__cf_bm') || 
              message.includes('Cookie') && message.includes('rejected') ||
              message.includes('input stream') ||
              message.includes('Error in input stream')) {
            event.preventDefault();
            event.stopPropagation();
            return false;
          }
        }, true);

        // Capturar promesas rechazadas no manejadas relacionadas con cookies
        window.addEventListener('unhandledrejection', function(event) {
          var reason = event.reason;
          var message = reason?.message || reason?.toString() || '';
          if (message.includes('__cf_bm') || 
              message.includes('Cookie') && message.includes('rejected') ||
              message.includes('input stream')) {
            event.preventDefault();
            return false;
          }
        });
      }
    })();
  `.trim();

  return (
    <html lang="es" data-theme="light" data-theme-mode="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: errorSuppressionScript }} />
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
