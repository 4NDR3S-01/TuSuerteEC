/**
 * Revisión visual: recorre las páginas con cada rol, en tema claro y oscuro, en móvil y escritorio.
 * Guarda capturas y falla si alguna página tiene desplazamiento horizontal (contenido más ancho que la pantalla)
 * o errores de JavaScript.
 *
 *   BASE_URL=http://localhost:3100 SCREENSHOTS_DIR=/tmp/capturas RAFFLE_ID=… DRAWN_RAFFLE_ID=… PAYMENT_ID=… \
 *     node tests/e2e/visual-review.mjs
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT = process.env.SCREENSHOTS_DIR ?? null;
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const { RAFFLE_ID, DRAWN_RAFFLE_ID, PAYMENT_ID } = process.env;

const ROUTES = {
  anon: ['/', '/sorteos', `/sorteos/${RAFFLE_ID}`, '/resultados', `/resultados/${DRAWN_RAFFLE_ID}`, '/ayuda', '/sobre-nosotros', '/terminos', '/bases', '/privacidad', '/reembolsos', '/iniciar-sesion', '/registro', '/recuperar', '/restablecer-clave', '/no-existe-404'],
  participant: ['/app', '/app/sorteos', `/app/sorteos/${RAFFLE_ID}`, '/app/boletos', '/app/boletos?vista=pagos', `/app/pagos/${PAYMENT_ID}`, '/app/planes', '/app/referidos', '/app/settings'],
  staff: ['/staff', '/staff/pagos', '/staff/ganadores', '/staff/eventos-vivo', '/staff/sorteos', '/staff/cuenta'],
  admin: ['/administrador', '/administrador/sorteos', '/administrador/sorteos/calendario', '/administrador/ganadores', '/administrador/eventos-vivo', '/administrador/pagos/transacciones', '/administrador/pagos/metodos', '/administrador/planes', '/administrador/marketing', '/administrador/reportes', '/administrador/usuarios', '/administrador/auditoria', '/administrador/cuenta', `/sorteo/${DRAWN_RAFFLE_ID}/ejecutar`],
};

const ACCOUNTS = {
  participant: [process.env.PARTICIPANT_EMAIL ?? 'ana@test.local', process.env.PARTICIPANT_PASSWORD ?? 'Clave12345'],
  staff: [process.env.STAFF_EMAIL ?? 'staff@test.local', process.env.STAFF_PASSWORD ?? 'Clave12345'],
  admin: [process.env.ADMIN_EMAIL ?? 'admin@tusuerte.local', process.env.ADMIN_PASSWORD ?? 'Admin12345'],
};

const VIEWPORTS = { movil: { width: 390, height: 844 }, escritorio: { width: 1366, height: 900 } };
const THEMES = ['light', 'dark'];

async function login(page, [email, password]) {
  await page.goto(`${BASE}/iniciar-sesion`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/iniciar-sesion'), { timeout: 30000, waitUntil: 'commit' }).catch(async () => {
    const messages = await page.locator('[role=alert]').allInnerTexts();
    throw new Error(`No se pudo iniciar sesión como ${email}: ${messages.join(' | ') || page.url()}`);
  });
}

function slug(path) {
  return path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'inicio';
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
  const problems = [];
  if (OUT) mkdirSync(OUT, { recursive: true });

  for (const [role, routes] of Object.entries(ROUTES)) {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      for (const theme of THEMES) {
        const context = await browser.newContext({ viewport, colorScheme: theme, locale: 'es-EC' });
        await context.addInitScript((value) => window.localStorage.setItem('theme-preference', value), theme);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message.slice(0, 100)));
        if (role !== 'anon') await login(page, ACCOUNTS[role]);

        for (const path of routes) {
          if (ONLY && !ONLY.test(path)) continue;
          errors.length = 0;
          // En modo desarrollo la primera compilación puede abortar la navegación: se reintenta una vez
          await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => page.goto(BASE + path, { waitUntil: 'networkidle' }));
          await page.waitForTimeout(300);
          const overflow = await page.evaluate(() => {
            const width = document.documentElement.clientWidth;
            if (document.documentElement.scrollWidth <= width + 1) return null;
            const offenders = [];
            for (const element of document.querySelectorAll('body *')) {
              const rect = element.getBoundingClientRect();
              if (rect.right > width + 1 && rect.width > 0 && getComputedStyle(element).position !== 'fixed') {
                // Ignorar descendientes de contenedores con scroll horizontal propio
                let parent = element.parentElement;
                let scrollable = false;
                while (parent) {
                  const style = getComputedStyle(parent);
                  if (/(auto|scroll|hidden)/.test(style.overflowX)) { scrollable = true; break; }
                  parent = parent.parentElement;
                }
                if (!scrollable) offenders.push(`${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)} (${Math.round(rect.right)}px)`);
              }
              if (offenders.length >= 3) break;
            }
            return { scrollWidth: document.documentElement.scrollWidth, width, offenders };
          });
          const label = `${role} ${viewportName} ${theme} ${path}`;
          if (overflow) problems.push(`${label}: desborde horizontal ${overflow.scrollWidth}px > ${overflow.width}px ${overflow.offenders.join(' | ')}`);
          if (errors.length) problems.push(`${label}: errores JS ${errors.join(' | ')}`);
          if (OUT) await page.screenshot({ path: `${OUT}/${role}-${viewportName}-${theme}-${slug(path)}.png`, fullPage: true });
        }
        await context.close();
      }
    }
    console.log(`✔ ${role}`);
  }

  await browser.close();
  if (problems.length) {
    console.log(`\n${problems.length} problema(s):\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log('Sin desbordes horizontales ni errores de JavaScript');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
