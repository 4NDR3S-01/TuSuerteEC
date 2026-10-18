import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// HSTS y la mejora a HTTPS solo tienen sentido cuando el sitio se sirve por HTTPS
const isHttps = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");

/**
 * Política de seguridad de contenido. Next.js inserta scripts en línea para hidratar la página,
 * por eso se permite 'unsafe-inline' en scripts; el resto de orígenes queda restringido al propio sitio.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    serverActions: {
      // Los comprobantes se suben por /api/upload; las acciones solo reciben datos pequeños
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
