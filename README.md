# TuSuerte

Plataforma de sorteos en línea para Ecuador hecha con Next.js 15, PostgreSQL (Prisma) y Auth.js.
Los pagos son manuales (transferencia o código QR): el participante sube su comprobante y el equipo lo verifica.
Los ganadores se eligen con un algoritmo publicado y verificable desde el navegador.

## Requisitos

- Node.js 20 o superior
- PostgreSQL 15 o superior

## Puesta en marcha local

1. **Crear la base de datos** (una sola vez):

   ```bash
   sudo systemctl start postgresql
   sudo -u postgres psql -c "CREATE USER tusuerte WITH PASSWORD 'tusuerte' CREATEDB;"
   sudo -u postgres psql -c "CREATE DATABASE tusuerte OWNER tusuerte;"
   ```

2. **Variables de entorno:** copia `.env.example` a `.env` y completa al menos `AUTH_SECRET`
   (`openssl rand -base64 32`). Los datos de contacto y del organizador son opcionales: lo que esté vacío no se muestra.

3. **Instalar, migrar y cargar datos iniciales:**

   ```bash
   npm install
   npm run db:migrate      # en producción: npm run db:deploy
   npm run db:seed
   ```

   El seed crea ciudades y parroquias de Ecuador, planes, sorteos y un método de pago de ejemplo, y el administrador
   `admin@tusuerte.local` / `Admin12345` (cámbialo con `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`, y cambia la contraseña al entrar).

4. **Levantar el servidor:** `npm run dev` y abre <http://localhost:3000>.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | ESLint (configuración oficial de Next) |
| `npm test` | Pruebas unitarias y de integración (Vitest) |
| `npm run db:test:prepare` | Aplica las migraciones a la base de pruebas |
| `npm run db:migrate` / `npm run db:deploy` | Migraciones (desarrollo / producción) |
| `npm run db:seed` | Datos iniciales (se puede repetir) |
| `npm run db:studio` | Prisma Studio |

## Roles y permisos

La matriz vive en `src/lib/auth/roles.ts` y el servidor la verifica en **cada** página y acción (el middleware es solo una primera barrera).

| Permiso | Participante | Staff | Admin |
| --- | :-: | :-: | :-: |
| Participar, ver sus boletos, pagos y comprobantes | ✓ | ✓ | ✓ |
| Revisar pagos (aprobar/rechazar; nunca los propios) | | ✓ | ✓ |
| Gestionar ganadores (contacto, entrega, foto, testimonio) | | ✓ | ✓ |
| Gestionar eventos en vivo | | ✓ | ✓ |
| Consultar todos los sorteos | | ✓ | ✓ |
| Crear/editar/publicar/cerrar sorteos | | | ✓ |
| Ejecutar sorteos | | | ✓ |
| Planes, métodos de pago, descuentos y referidos | | | ✓ |
| Usuarios (roles, suspensión), reportes y auditoría | | | ✓ |

Cambiar el rol, suspender una cuenta o cambiar la contraseña invalida las sesiones abiertas de esa cuenta.

**Cuentas del equipo:** en *Administración → Usuarios → Nueva cuenta del equipo* el admin crea cuentas de staff o de
administrador. Se genera una contraseña temporal que se muestra una sola vez; la persona ve un aviso hasta que la cambia en
*Mi cuenta*. Los participantes se registran solos en `/registro`.

## Integridad de los sorteos

- **Estados:** Borrador → Abierto → Cerrado → Sorteado → Finalizado. No se puede saltar a “Sorteado” ni reabrir un sorteo cerrado.
- **Condiciones protegidas:** con participantes o pagos no se puede cambiar el premio, el precio ni la modalidad, reducir ganadores o límites, ni adelantar fechas.
- **Cierre:** fija la lista de boletos y publica `SHA-256(semilla)` (compromiso) y la huella de la lista. La semilla se guarda aparte (`raffle_draw_secrets`).
- **Ejecución:** revela la semilla y calcula los ganadores con `sha256-v1` (`src/lib/raffle/draw-algorithm.ts`, sin sesgo de módulo). Si la lista de boletos cambió desde el cierre, el sorteo se detiene y queda registrado.
- **Verificación:** `/resultados/[id]` repite el cálculo en el navegador del visitante.
- Boletos, aprobaciones y ejecuciones usan transacciones y bloqueos de fila: no hay números duplicados, dobles aprobaciones ni sorteos ejecutados dos veces.

## Pagos

1. El participante elige cantidad (y un código de descuento opcional); el **servidor** calcula el total.
2. Ve los datos de pago con el monto exacto, paga y sube el comprobante (se valida su tipo real por la firma del archivo).
3. Staff o admin lo revisan. Un mismo número de comprobante no puede usarse dos veces por método.
4. Al aprobar se emiten los boletos (o se activa/renueva el plan) y se avisa al participante; al rechazar se libera el código de descuento.

Los comprobantes son privados: solo los ven su dueño y quien revisa pagos.

## Marketing

- Página pública por sorteo con enlaces para compartir; sorteos guardados con aviso 24 h antes del cierre.
- Códigos de descuento (porcentaje o monto, vigencia, límite total y por persona, alcance).
- Referidos: el código de invitación se recuerda 30 días; cuando se aprueba el primer pago del invitado, quien invitó recibe un código personal de un solo uso (porcentaje y vigencia configurables en *Administración → Descuentos y referidos*).

## Pruebas

```bash
# Unitarias + integración (usa la base tusuerte_test, nunca la de desarrollo)
psql "postgresql://tusuerte:tusuerte@localhost:5432/tusuerte" -c "CREATE DATABASE tusuerte_test"   # una vez
npm run db:test:prepare
npm test

# Extremo a extremo contra un servidor de producción apuntando a la base de pruebas
DATABASE_URL=$TEST_DATABASE_URL npx tsx prisma/seed.ts
DATABASE_URL=$TEST_DATABASE_URL npx tsx tests/e2e/create-users.ts
npm run build
DATABASE_URL=$TEST_DATABASE_URL NEXT_PUBLIC_APP_URL=http://localhost:3100 npx next start -p 3100 &
BASE_URL=http://localhost:3100 node tests/e2e/permissions.mjs   # matriz de permisos por HTTP
BASE_URL=http://localhost:3100 node tests/e2e/flow.mjs          # flujo completo en Chromium
# Revisión visual: todas las páginas por rol, en tema claro y oscuro, móvil (390 px) y escritorio;
# falla si hay desplazamiento horizontal o errores de JavaScript. Necesita IDs de un sorteo abierto,
# uno sorteado y un pago del participante de prueba.
BASE_URL=http://localhost:3100 SCREENSHOTS_DIR=/tmp/capturas RAFFLE_ID=… DRAWN_RAFFLE_ID=… PAYMENT_ID=… node tests/e2e/visual-review.mjs
```

`npm test` vacía la base `tusuerte_test`: vuelve a cargar el seed y `tests/e2e/create-users.ts` antes de las pruebas de extremo a extremo.

## Producción

- Sirve el sitio por **HTTPS** y define `NEXT_PUBLIC_APP_URL=https://…` (activa HSTS).
- `AUTH_SECRET` único y secreto; nunca subas `.env` al repositorio.
- Configura SMTP para que la recuperación de contraseña funcione.
- Respalda la base de datos y la carpeta `uploads/` (comprobantes e imágenes); si usas varias instancias, mueve `uploads/` a un almacenamiento compartido y el limitador de solicitudes (`src/lib/security/rate-limit.ts`) a Redis.
- Ejecuta `npm run db:deploy` en cada despliegue.
- Revisa con un abogado los textos de `/terminos`, `/bases`, `/privacidad` y `/reembolsos` y luego define `NEXT_PUBLIC_LEGAL_REVIEWED=true`.

## Estructura

- `prisma/` — esquema, migraciones y seed
- `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts` — autenticación y primera barrera de rutas
- `src/lib/auth/` — sesión, matriz de permisos y guardas
- `src/lib/actions/` — acciones de servidor (auth, perfil, admin, marketing, notificaciones)
- `src/lib/payments/` — solicitudes, precios y revisión de pagos
- `src/lib/raffle/` — boletos, ciclo de vida y algoritmo verificable
- `src/lib/marketing/` — descuentos, referidos y favoritos
- `src/lib/audit.ts` — registro de auditoría
- `src/components/ui/kit.tsx` — componentes base del sistema de diseño
- `tests/` — pruebas unitarias, de integración y de extremo a extremo
