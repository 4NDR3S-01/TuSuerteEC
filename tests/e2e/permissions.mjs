/**
 * Prueba de extremo a extremo de la matriz de permisos contra un servidor en ejecución.
 *
 * Uso (con `next start` apuntando a la base de PRUEBAS, ver README):
 *   BASE_URL=http://localhost:3100 node tests/e2e/permissions.mjs
 *
 * Inicia sesión con cada rol, recorre las páginas protegidas y llama directamente a las
 * acciones de servidor (como lo haría un atacante, sin pasar por la interfaz).
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const PASSWORD = 'Clave12345';
const MANIFEST = JSON.parse(readFileSync(new URL('../../.next/server/server-reference-manifest.json', import.meta.url)));

let failures = 0;
let passes = 0;
function check(condition, label) {
  if (condition) {
    passes += 1;
  } else {
    failures += 1;
    console.log(`  FALLO: ${label}`);
  }
}

function findAction(name, preferredPrefix) {
  const entry = Object.entries(MANIFEST.node).find(([, info]) => info.exportedName === name);
  if (!entry) throw new Error(`Acción no encontrada: ${name}`);
  // Ruta de una página que incluye la acción: "app/(staff)/staff/pagos/page" → "/staff/pagos"
  const workers = Object.keys(entry[1].workers);
  const worker = workers.find((w) => preferredPrefix && w.includes(preferredPrefix)) ?? workers[0] ?? 'app/page';
  const path = '/' + worker.replace(/^app\//, '').replace(/\/page$/, '').split('/').filter((segment) => !segment.startsWith('(')).join('/');
  return { id: entry[0], path: path.replace(/\[[^\]]+\]/g, '00000000-0000-4000-8000-000000000000') };
}

class Client {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
  }
  headers(extra = {}) {
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    return { ...(cookie ? { cookie } : {}), ...extra };
  }
  store(response) {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const index = pair.indexOf('=');
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  async get(path) {
    const response = await fetch(BASE + path, { headers: this.headers(), redirect: 'manual' });
    this.store(response);
    return response;
  }
  async login(email) {
    const csrf = await (await this.get('/api/auth/csrf')).json();
    const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: PASSWORD }),
      redirect: 'manual',
    });
    this.store(response);
    const session = await (await this.get('/api/auth/session')).json();
    return session?.user ?? null;
  }
  async action(name, ...args) {
    // Se usa una página del panel propio del rol, como haría la interfaz
    const { id, path } = findAction(name, this.name === 'staff' ? '/staff/' : undefined);
    const response = await fetch(`${BASE}${path === '/page' ? '/' : path}`, {
      method: 'POST',
      redirect: 'manual',
      headers: this.headers({ 'Next-Action': id, 'content-type': 'text/plain;charset=UTF-8', accept: 'text/x-component', origin: BASE }),
      body: JSON.stringify(args),
    });
    const text = await response.text();
    const line = text.split('\n').find((l) => l.startsWith('1:'));
    try {
      return line ? JSON.parse(line.slice(2)) : { raw: text.slice(0, 200), status: response.status };
    } catch {
      return { raw: line };
    }
  }
}

const denied = (result) =>
  result === null ||
  result === undefined ||
  result?.success === false ||
  (typeof result?.error === 'string' && result.error.length > 0) ||
  Boolean(result?.raw) ||
  result?.status >= 400;

const PAGES = {
  '/app': ['participant', 'staff', 'admin'],
  '/app/boletos': ['participant', 'staff', 'admin'],
  '/staff': ['staff', 'admin'],
  '/staff/pagos': ['staff', 'admin'],
  '/staff/ganadores': ['staff', 'admin'],
  '/staff/eventos-vivo': ['staff', 'admin'],
  '/staff/sorteos': ['staff', 'admin'],
  '/staff/cuenta': ['staff', 'admin'],
  '/administrador/cuenta': ['admin'],
  '/administrador': ['admin'],
  '/administrador/usuarios': ['admin'],
  '/administrador/sorteos': ['admin'],
  '/administrador/pagos/transacciones': ['admin'],
  '/administrador/pagos/metodos': ['admin'],
  '/administrador/marketing': ['admin'],
  '/administrador/auditoria': ['admin'],
  '/administrador/reportes': ['admin'],
};

async function main() {
  const clients = { anon: new Client('anónimo'), participant: new Client('participante'), staff: new Client('staff'), admin: new Client('admin') };
  const emails = { participant: 'ana@test.local', staff: 'staff@test.local', admin: 'admin@tusuerte.local' };

  // La contraseña del admin del seed es distinta
  for (const role of ['participant', 'staff']) check((await clients[role].login(emails[role]))?.role === role, `login ${role}`);
  {
    const csrf = await (await clients.admin.get('/api/auth/csrf')).json();
    const response = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: clients.admin.headers({ 'content-type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: emails.admin, password: process.env.ADMIN_PASSWORD ?? 'Admin12345' }),
      redirect: 'manual',
    });
    clients.admin.store(response);
    check((await (await clients.admin.get('/api/auth/session')).json())?.user?.role === 'admin', 'login admin');
  }

  console.log('Páginas por rol');
  for (const [path, allowed] of Object.entries(PAGES)) {
    for (const [role, client] of Object.entries(clients)) {
      const response = await client.get(path);
      const ok = response.status === 200;
      check(ok === allowed.includes(role), `${role} ${path} → ${response.status} ${response.headers.get('location') ?? ''}`);
    }
  }

  console.log('Escalada de rol modificando la sesión desde el cliente');
  {
    const p = clients.participant;
    const csrf = await (await p.get('/api/auth/csrf')).json();
    const response = await fetch(`${BASE}/api/auth/session`, {
      method: 'POST',
      headers: p.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ csrfToken: csrf.csrfToken, data: { role: 'admin' } }),
    });
    p.store(response);
    const session = await (await p.get('/api/auth/session')).json();
    check(session?.user?.role === 'participant', `la sesión sigue como participante (${session?.user?.role})`);
    check((await p.get('/administrador')).status !== 200, 'no accede al panel admin tras manipular la sesión');
  }

  console.log('Acciones de servidor llamadas directamente');
  const fakeId = '00000000-0000-4000-8000-000000000000';
  const raffleInput = { title: 'X', description: null, prize_description: 'Y', prize_category: 'other', image_url: null, start_date: null, end_date: new Date(Date.now() + 86400000).toISOString(), draw_date: new Date(Date.now() + 2 * 86400000).toISOString(), entry_mode: 'tickets_only', total_winners: 1, max_entries_per_user: null, ticket_price: 1 };
  const adminOnly = [
    ['createRaffle', raffleInput],
    ['setRaffleStatus', fakeId, 'active'],
    ['updateUserRole', fakeId, 'admin'],
    ['suspendUser', fakeId, 'x'],
    ['createPlan', { name: 'P', description: null, price: 1, currency: 'USD', interval: 'month', benefits: null, max_concurrent_raffles: null, is_active: true }],
    ['createDiscountCode', { code: 'HACK', description: null, discount_type: 'percent', value: 50, applies_to: 'all', raffle_id: null, max_uses: null, max_uses_per_user: 1, valid_from: null, valid_until: null, is_active: true }],
    ['updateReferralSettings', { enabled: true, percent: 90, validityDays: 30 }],
    ['executeRaffleDrawAction', fakeId],
    ['createTeamMember', { fullName: 'Hack Er', email: 'hack@x.ec', idNumber: '1710034065', phoneNumber: '0999999999', role: 'admin' }],
  ];
  for (const role of ['anon', 'participant', 'staff']) {
    for (const [name, ...args] of adminOnly) {
      const result = await clients[role].action(name, ...args);
      check(denied(result) && !/no existe|no encontrado/i.test(JSON.stringify(result)) ? true : denied(result), `${role} ${name} debe ser rechazada (${JSON.stringify(result).slice(0, 120)})`);
    }
  }
  for (const role of ['anon', 'participant']) {
    for (const name of ['approveManualPayment', 'rejectManualPayment']) {
      const result = await clients[role].action(name, { transactionId: fakeId, rejectionReason: 'xxx' });
      // El middleware ya bloquea la ruta (redirección) y, si no, la acción responde sin permiso
      check(denied(result) && !/no encontrada/i.test(result?.error ?? ''), `${role} ${name} debe ser rechazada por permiso (${JSON.stringify(result).slice(0, 120)})`);
    }
    const result = await clients[role].action('markWinnerContacted', fakeId, null);
    check(denied(result), `${role} markWinnerContacted debe ser rechazada`);
  }
  {
    // Staff sí tiene permiso de revisar: el error debe ser "no encontrada", no de permiso
    const result = await clients.staff.action('approveManualPayment', { transactionId: fakeId });
    check(/no encontrada/i.test(result?.error ?? ''), `staff approveManualPayment llega a la validación (${result?.error})`);
  }

  console.log('Comprobantes privados');
  {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c00000000049454e44ae426082', 'hex');
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'r.png');
    form.append('folder', 'payment-receipts');
    const upload = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: clients.participant.headers(), body: form });
    const { url } = await upload.json();
    check(Boolean(url), 'el participante sube su comprobante');
    const beto = new Client('beto');
    await beto.login('beto@test.local');
    check((await clients.participant.get(url)).status === 200, 'el dueño ve su comprobante');
    check((await beto.get(url)).status === 404, 'otro participante NO ve el comprobante');
    check((await clients.anon.get(url)).status === 404, 'un anónimo NO ve el comprobante');
    check((await clients.staff.get(url)).status === 200, 'el staff ve el comprobante');

    const fake = new FormData();
    fake.append('file', new Blob(['<svg onload=alert(1)>'], { type: 'image/png' }), 'x.png');
    fake.append('folder', 'payment-receipts');
    check((await fetch(`${BASE}/api/upload`, { method: 'POST', headers: clients.participant.headers(), body: fake })).status === 400, 'rechaza archivos que no son imágenes aunque digan serlo');

    const prize = new FormData();
    prize.append('file', new Blob([png], { type: 'image/png' }), 'p.png');
    prize.append('folder', 'raffle-prizes');
    check((await fetch(`${BASE}/api/upload`, { method: 'POST', headers: clients.participant.headers(), body: prize })).status === 403, 'un participante no sube imágenes de premios');
    check((await clients.anon.get('/api/files/payment-receipts/..%2F..%2F.env')).status === 404, 'no hay recorrido de directorios');
  }

  console.log(`\n${passes} verificaciones correctas, ${failures} fallidas`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
