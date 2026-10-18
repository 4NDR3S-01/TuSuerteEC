import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reutiliza la misma instancia en desarrollo para no abrir conexiones en cada recarga
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Convierte el resultado de Prisma a un objeto plano (fechas como string ISO),
 * igual que devolvía Supabase. Así los componentes cliente reciben la misma forma de datos.
 */
export function toPlain<T>(value: T): Jsonify<T> {
  return JSON.parse(JSON.stringify(value));
}

type Jsonify<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;
