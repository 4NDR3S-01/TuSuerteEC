import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, 'src'),
  // `server-only` lanza un error fuera de Next.js; en pruebas se reemplaza por un módulo vacío
  'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
};

export default defineConfig({
  test: {
    // Las pruebas de integración comparten la base de datos de prueba: un archivo a la vez
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['tests/integration/setup.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
