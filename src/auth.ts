import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/db';
import { authConfig } from './auth.config';
import { checkRateLimit, resetRateLimit } from './lib/security/rate-limit';
import { recordAudit } from './lib/audit';

class InvalidCredentials extends CredentialsSignin {
  code = 'invalid_credentials';
}

class MissingProfile extends CredentialsSignin {
  code = 'missing_profile';
}

class AccountSuspended extends CredentialsSignin {
  code = 'account_suspended';
}

class TooManyAttempts extends CredentialsSignin {
  code = 'too_many_attempts';
}

// Hash válido para comparar aunque el correo no exista (tiempo de respuesta similar)
const DUMMY_HASH = '$2b$10$U18UBEX67bnc2cNL0BplIu4wmgzohE11NSpe5clEIw8vtB6UFxkva';

const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };
const LOGIN_IP_LIMIT = { limit: 30, windowMs: 15 * 60 * 1000 };

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);

      // `update()` desde el cliente: refrescar nombre, correo y rol desde la base de datos,
      // solo si la sesión sigue vigente (misma versión de sesión y cuenta no suspendida).
      if (params.trigger === 'update' && token.id) {
        const account = await prisma.users.findUnique({
          where: { id: token.id as string },
          include: { profile: { select: { full_name: true, role: true } } },
        });
        if (!account?.profile || account.suspended_at || account.session_version !== (token.sessionVersion ?? 0)) {
          return null;
        }
        token.name = account.profile.full_name;
        token.email = account.email;
        token.role = account.profile.role;
      }

      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');

        if (!email || !password || password.length > 200) {
          throw new InvalidCredentials();
        }

        // Límites por correo (fuerza bruta contra una cuenta) y por IP (contra muchas cuentas)
        const rateKey = `login:${email}`;
        const ip = request?.headers?.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
        if (!checkRateLimit(rateKey, LOGIN_LIMIT).allowed || !checkRateLimit(`login-ip:${ip}`, LOGIN_IP_LIMIT).allowed) {
          throw new TooManyAttempts();
        }

        const user = await prisma.users.findUnique({
          where: { email },
          include: { profile: { select: { full_name: true, role: true } } },
        });

        const passwordOk = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
        if (!user || !passwordOk) {
          throw new InvalidCredentials();
        }

        if (!user.profile) {
          throw new MissingProfile();
        }

        if (user.suspended_at) {
          throw new AccountSuspended();
        }

        resetRateLimit(rateKey);
        await recordAudit({ actorId: user.id, actorRole: user.profile.role, action: 'auth.login', entityType: 'user', entityId: user.id });

        return {
          id: user.id,
          email: user.email,
          name: user.profile.full_name,
          role: user.profile.role,
          sessionVersion: user.session_version,
        };
      },
    }),
  ],
});
