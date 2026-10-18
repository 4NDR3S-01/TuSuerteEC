/**
 * Entorno de pruebas de integración: base de datos `tusuerte_test` (nunca la de desarrollo)
 * y una sesión simulada que cada prueba controla con `actAs()`.
 */
import { vi } from 'vitest';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://tusuerte:tusuerte@localhost:5432/tusuerte_test?schema=public';
if (!/tusuerte_test/.test(TEST_DATABASE_URL)) throw new Error('Las pruebas solo se ejecutan contra una base *_test');
process.env.DATABASE_URL = TEST_DATABASE_URL;

type FakeSession = { user: { id: string; role: string; sessionVersion: number; email: string; name: string } } | null;
export const sessionState: { current: FakeSession } = { current: null };

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '127.0.0.1' }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock('../../src/auth', () => ({ auth: async () => sessionState.current }));
