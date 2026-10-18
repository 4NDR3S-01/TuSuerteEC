import type { NextAuthConfig } from 'next-auth';

/**
 * Configuración de Auth.js compatible con el middleware (Edge runtime).
 * No importa Prisma ni bcrypt; el proveedor de credenciales se agrega en `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: '/iniciar-sesion',
  },
  session: {
    strategy: 'jwt',
    // La sesión expira tras 7 días sin renovarse
    maxAge: 7 * 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? 'participant';
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
        token.name = user.name;
        token.email = user.email;
      }
      // Las actualizaciones (`update()`) se resuelven en `auth.ts` leyendo la base de datos:
      // nunca se aceptan datos enviados por el cliente (p. ej. un rol).
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? 'participant';
        session.user.sessionVersion = (token.sessionVersion as number) ?? 0;
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? '';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
