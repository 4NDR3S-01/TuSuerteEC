/**
 * Flujo completo en un navegador real (Chromium del sistema) contra un servidor en ejecución:
 * registro → compra de boletos con comprobante → aprobación del staff → cierre y ejecución del
 * sorteo por el admin → verificación pública del resultado en el navegador.
 *
 *   BASE_URL=http://localhost:3100 CHROMIUM_PATH=/usr/bin/chromium node tests/e2e/flow.mjs
 *
 * Requiere la base de PRUEBAS preparada (seed + tests/e2e/create-users.ts).
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const SHOTS = process.env.SCREENSHOTS_DIR ?? null;
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c00000000049454e44ae426082', 'hex');

let step = 0;
async function shot(page, name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  step += 1;
  await page.screenshot({ path: `${SHOTS}/${String(step).padStart(2, '0')}-${name}.png`, fullPage: true });
}

async function login(page, email, password) {
  await page.goto(`${BASE}/iniciar-sesion`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/iniciar-sesion'), { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  const consoleErrors = [];
  const newContext = async (options = {}) => {
    const context = await browser.newContext({ locale: 'es-EC', ...options });
    context.on('page', (p) => p.on('pageerror', (error) => consoleErrors.push(`${p.url()} → ${error.message.slice(0, 80)}`)));
    return context;
  };
  const suffix = Date.now().toString().slice(-6);
  const email = `nuevo${suffix}@test.local`;

  // 1. Registro desde la portada (móvil)
  const participant = await newContext({ viewport: { width: 390, height: 844 } });
  const page = await participant.newPage();
  await page.goto(BASE);
  await shot(page, 'portada-movil');
  await page.goto(`${BASE}/registro`);
  await page.getByLabel('Nombre completo').fill('Carla Nueva Prueba');
  // Cédula válida generada a partir del sufijo
  // Provincia 17, tercer dígito < 6 (persona natural) y 6 dígitos variables
  const base = `171${suffix}`;
  const sum = base.split('').reduce((acc, d, i) => { let p = Number(d) * (i % 2 === 0 ? 2 : 1); if (p >= 10) p -= 9; return acc + p; }, 0);
  await page.getByLabel('Cédula').fill(`${base}${(10 - (sum % 10)) % 10}`);
  await page.getByLabel('Celular').fill('991234567');
  await page.getByLabel('Ciudad').selectOption({ label: 'Quito' });
  await page.getByLabel('Parroquia').selectOption({ index: 1 });
  await page.getByLabel('Dirección').fill('Av. Amazonas N10');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.locator('#reg-password').fill('Segura123');
  await page.locator('#reg-confirmPassword').fill('Segura123');
  await page.locator('#reg-acceptTerms').check();
  await shot(page, 'registro');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForURL(`${BASE}/app`, { timeout: 20000 }).catch(async (error) => {
    const alerts = await page.locator('[role=alert], [role=status]').allInnerTexts();
    throw new Error(`El registro no redirigió: ${alerts.join(' | ') || error.message}`);
  });
  console.log('✔ registro con inicio de sesión automático');

  // 2. Compra de 3 boletos
  await page.goto(`${BASE}/app/sorteos`);
  await page.getByRole('link', { name: /iPhone/ }).first().click();
  await page.waitForURL(/\/app\/sorteos\//);
  const raffleUrl = page.url();
  const raffleId = raffleUrl.split('/').pop();
  await page.getByRole('button', { name: 'Agregar un boleto' }).click();
  await page.getByRole('button', { name: 'Agregar un boleto' }).click();
  await page.getByText('Total a pagar').waitFor();
  await shot(page, 'compra-paso1');
  await page.getByRole('button', { name: 'Continuar al pago' }).click();
  await page.getByText('Monto exacto a pagar').waitFor();
  const amountText = await page.locator('text=Monto exacto a pagar').locator('..').innerText();
  if (!/6[,.]00/.test(amountText)) throw new Error(`Monto inesperado: ${amountText}`);
  await shot(page, 'compra-paso2');
  await page.getByRole('button', { name: 'Ya pagué, subir comprobante' }).click();
  await page.getByLabel('Número de comprobante o transacción').fill(`E2E-${suffix}`);
  await page.locator('input[type=file]').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('checkbox', { name: /Confirmo que pagué/ }).check();
  await shot(page, 'compra-paso3');
  await page.getByRole('button', { name: 'Enviar para verificación' }).click();
  await page.getByText('Recibimos tu solicitud').waitFor({ timeout: 15000 });
  console.log('✔ compra registrada (3 boletos, $6,00)');

  // 3. El staff aprueba el pago
  const staffContext = await newContext({ viewport: { width: 1366, height: 900 } });
  const staff = await staffContext.newPage();
  await login(staff, 'staff@test.local', 'Clave12345');
  await staff.goto(`${BASE}/staff/pagos`);
  await staff.getByRole('button', { name: /Carla Nueva Prueba/ }).click();
  await shot(staff, 'staff-detalle-pago');
  await staff.getByRole('button', { name: 'Aprobar' }).click();
  await staff.getByRole('button', { name: 'Confirmar aprobación' }).click();
  await staff.getByText(/Pago aprobado\. \d+ boletos emitidos/).waitFor({ timeout: 15000 });
  console.log('✔ staff aprobó el pago');

  // 4. El participante ve sus boletos
  await page.goto(`${BASE}/app/boletos`);
  // La página se transmite por partes (loading.tsx): esperar a que aparezca la lista
  await page.locator('[aria-label="Números de boleto"] li').first().waitFor({ timeout: 15000 });
  const tickets = await page.locator('[aria-label="Números de boleto"] li').count();
  if (tickets !== 3) throw new Error(`Se esperaban 3 boletos y hay ${tickets} (${page.url()}): ${(await page.locator("main").innerText()).slice(0, 300)}`);
  await shot(page, 'mis-boletos');
  console.log('✔ el participante ve sus 3 boletos');

  // 5. El admin cierra y ejecuta el sorteo
  const adminContext = await newContext({ viewport: { width: 1366, height: 900 } });
  const admin = await adminContext.newPage();
  await login(admin, 'admin@tusuerte.local', process.env.ADMIN_PASSWORD ?? 'Admin12345');
  await admin.goto(`${BASE}/administrador/sorteos`);
  await shot(admin, 'admin-sorteos');
  const row = admin.locator('div', { hasText: 'iPhone' }).filter({ has: admin.getByRole('button', { name: 'Cerrar' }) }).last();
  await row.getByRole('button', { name: 'Cerrar' }).click();
  await admin.getByRole('button', { name: 'Cerrar participación' }).click();
  await admin.getByRole('link', { name: 'Ejecutar sorteo' }).first().waitFor({ timeout: 15000 });
  await admin.goto(`${BASE}/sorteo/${raffleId}/ejecutar`);
  await admin.getByRole('button', { name: 'Iniciar sorteo' }).click();
  await admin.getByRole('link', { name: /verificación/ }).waitFor({ timeout: 30000 });
  await admin.waitForTimeout(3000);
  await shot(admin, 'ejecucion');
  console.log('✔ sorteo cerrado y ejecutado');

  // 6. Verificación pública (sin sesión)
  const visitor = await (await newContext()).newPage();
  await visitor.goto(`${BASE}/resultados/${raffleId}`);
  await visitor.getByRole('button', { name: 'Verificar en mi navegador' }).click();
  await visitor.getByText('Resultado verificado').waitFor({ timeout: 15000 });
  await shot(visitor, 'resultado-verificado');
  console.log('✔ el resultado se verifica en el navegador');

  await browser.close();
  if (consoleErrors.length) {
    console.log('Errores de JavaScript en las páginas:', consoleErrors);
    process.exit(1);
  }
  console.log('Flujo completo correcto');
}

main().catch((error) => {
  console.error('FALLO:', error.message);
  process.exit(1);
});
