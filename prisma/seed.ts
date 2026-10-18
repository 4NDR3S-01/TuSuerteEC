/**
 * Datos iniciales para desarrollo local.
 * Ejecutar con: npm run db:seed
 *
 * Es idempotente: se puede ejecutar varias veces sin duplicar registros.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lista inicial de ciudades principales con algunas de sus parroquias.
// Se puede ampliar libremente; "Otra" permite registrarse desde cualquier lugar.
const ECUADOR_LOCATIONS: Record<string, string[]> = {
  Quito: [
    'Belisario Quevedo', 'Calderón', 'Carcelén', 'Centro Histórico', 'Chilibulo', 'Chillogallo', 'Chimbacalle',
    'Cochapamba', 'Comité del Pueblo', 'Concepción', 'Conocoto', 'Cotocollao', 'Cumbayá', 'El Condado', 'El Inca',
    'Guamaní', 'Iñaquito', 'Itchimbía', 'Jipijapa', 'Kennedy', 'La Argelia', 'La Ecuatoriana', 'La Ferroviaria',
    'La Libertad', 'La Magdalena', 'La Mena', 'Mariscal Sucre', 'Ponceano', 'Pomasqui', 'Puengasí', 'Quitumbe',
    'Rumipamba', 'San Bartolo', 'San Isidro del Inca', 'San Juan', 'Solanda', 'Tumbaco', 'Turubamba',
  ],
  Guayaquil: [
    'Ayacucho', 'Bolívar', 'Carbo', 'Chongón', 'Febres Cordero', 'García Moreno', 'Letamendi', 'Nueve de Octubre',
    'Olmedo', 'Pascuales', 'Roca', 'Rocafuerte', 'Sucre', 'Tarqui', 'Urdaneta', 'Ximena',
  ],
  Cuenca: [
    'Bellavista', 'Cañaribamba', 'El Batán', 'El Sagrario', 'El Vecino', 'Gil Ramírez Dávalos', 'Hermano Miguel',
    'Huayna Cápac', 'Machángara', 'Monay', 'San Blas', 'San Sebastián', 'Sucre', 'Totoracocha', 'Yanuncay',
  ],
  'Santo Domingo': ['Abraham Calazacón', 'Bombolí', 'Chiguilpe', 'Río Toachi', 'Río Verde', 'Santo Domingo', 'Zaracay'],
  Machala: ['El Cambio', 'El Retiro', 'Jambelí', 'La Providencia', 'Machala', 'Nueve de Mayo', 'Puerto Bolívar'],
  Manta: ['Eloy Alfaro', 'Los Esteros', 'Manta', 'San Lorenzo', 'San Mateo', 'Santa Marianita', 'Tarqui'],
  Portoviejo: [
    '12 de Marzo', '18 de Octubre', 'Andrés de Vera', 'Colón', 'Francisco Pacheco', 'Picoazá', 'Portoviejo',
    'San Pablo', 'Simón Bolívar',
  ],
  Ambato: [
    'Atocha-Ficoa', 'Celiano Monge', 'Huachi Chico', 'Huachi Loreto', 'La Matriz', 'La Merced', 'La Península',
    'Pishilata', 'San Francisco',
  ],
  Riobamba: ['Lizarzaburu', 'Maldonado', 'Velasco', 'Veloz', 'Yaruquíes'],
  Loja: ['Carigán', 'El Sagrario', 'El Valle', 'Punzara', 'San Sebastián', 'Sucre'],
  Ibarra: ['Alpachaca', 'Caranqui', 'Priorato', 'Sagrario', 'San Francisco'],
  Esmeraldas: ['5 de Agosto', 'Bartolomé Ruiz', 'Esmeraldas', 'Luis Tello', 'Simón Plata Torres'],
  Latacunga: ['Eloy Alfaro', 'Ignacio Flores', 'Juan Montalvo', 'La Matriz', 'San Buenaventura'],
  Quevedo: [
    '24 de Mayo', 'Guayacán', 'Nicolás Infante Díaz', 'Quevedo', 'San Camilo', 'San Cristóbal', 'Siete de Octubre',
    'Venus del Río Quevedo', 'Viva Alfaro',
  ],
  Durán: ['El Recreo', 'Eloy Alfaro'],
  Milagro: ['Camilo Andrade', 'Chirijos', 'Enrique Valdez', 'Ernesto Seminario', 'Milagro'],
  Babahoyo: ['Barreiro', 'Clemente Baquerizo', 'Dr. Camilo Ponce', 'El Salto'],
  Tulcán: ['González Suárez', 'Tulcán'],
  Otavalo: ['Jordán', 'San Luis'],
  Salinas: ['Carlos Espinoza Larrea', 'José Luis Tamayo', 'Salinas', 'Santa Rosa', 'Vicente Rocafuerte'],
  Otra: ['Otra'],
};

async function seedLocations() {
  const country = await prisma.countries.upsert({
    where: { code: 'EC' },
    update: {},
    create: { code: 'EC', name: 'Ecuador' },
  });

  for (const [cityName, parishes] of Object.entries(ECUADOR_LOCATIONS)) {
    const city = await prisma.cities.upsert({
      where: { country_id_name: { country_id: country.id, name: cityName } },
      update: {},
      create: { name: cityName, country_id: country.id },
    });

    await prisma.parishes.createMany({
      data: parishes.map((name) => ({ name, city_id: city.id })),
      skipDuplicates: true,
    });
  }

  console.log(`✔ Ubicaciones: ${Object.keys(ECUADOR_LOCATIONS).length} ciudades de Ecuador`);
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@tusuerte.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345';

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    console.log(`✔ Administrador ya existe: ${email}`);
    return;
  }

  const quito = await prisma.cities.findFirst({ where: { name: 'Quito' }, include: { parishes: { take: 1 } } });

  await prisma.users.create({
    data: {
      email,
      password_hash: await bcrypt.hash(password, 10),
      email_verified_at: new Date(),
      profile: {
        create: {
          full_name: 'Administrador TuSuerte',
          id_number: '9999999999',
          phone_number: '+593999999999',
          email,
          city_id: quito?.id ?? null,
          parish_id: quito?.parishes[0]?.id ?? null,
          address: 'Oficina principal',
          role: 'admin',
        },
      },
    },
  });

  console.log(`✔ Administrador creado: ${email} / ${password}  (cámbiala desde Configuración → Seguridad)`);
}

async function seedPlans() {
  if ((await prisma.plans.count()) > 0) {
    console.log('✔ Planes ya existen');
    return;
  }

  await prisma.plans.createMany({
    data: [
      {
        name: 'Básico',
        description: 'Participa automáticamente en los sorteos del mes.',
        price: 4.99,
        interval: 'month',
        benefits: ['Participación automática en sorteos para suscriptores', 'Avisos dentro de la app sobre nuevos sorteos'],
        max_concurrent_raffles: 3,
      },
      {
        name: 'Premium',
        description: 'Participa en todos los sorteos para suscriptores a la vez.',
        price: 9.99,
        interval: 'month',
        is_featured: true,
        benefits: ['Participación automática en todos los sorteos para suscriptores'],
      },
      {
        name: 'Premium Anual',
        description: 'El plan Premium con 20% de descuento.',
        price: 95.9,
        interval: 'year',
        benefits: ['Todo lo del plan Premium', 'Pagas una vez al año (equivale a 20% de descuento)'],
      },
    ],
  });

  console.log('✔ Planes de ejemplo creados');
}

async function seedPaymentMethods() {
  if ((await prisma.payment_methods.count()) > 0) {
    console.log('✔ Métodos de pago ya existen');
    return;
  }

  await prisma.payment_methods.create({
    data: {
      name: 'Transferencia bancaria (ejemplo)',
      type: 'manual_transfer',
      description: 'Datos de ejemplo: reemplázalos por tu cuenta real en Pagos → Métodos.',
      config: {
        scopes: ['raffles', 'plans'],
        currency: 'USD',
        manual: {
          bankName: 'Banco de ejemplo',
          accountNumber: '0000000000',
          accountType: 'Ahorros',
          beneficiary: 'TuSuerte',
          identification: '9999999999001',
          instructions: 'Transfiere el valor exacto y sube la foto del comprobante.',
          requiresProof: true,
        },
      },
    },
  });

  console.log('✔ Método de pago de ejemplo creado (transferencia, edítalo con tus datos reales)');
}

async function seedRaffles() {
  if ((await prisma.raffles.count()) > 0) {
    console.log('✔ Sorteos ya existen');
    return;
  }

  const now = new Date();
  const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.raffles.createMany({
    data: [
      {
        title: 'iPhone de última generación (ejemplo)',
        description: 'Sorteo de ejemplo para probar el flujo completo.',
        prize_description: 'Un smartphone nuevo',
        prize_category: 'electronics',
        start_date: now,
        end_date: inDays(14),
        draw_date: inDays(15),
        status: 'active',
        entry_mode: 'hybrid',
        total_winners: 1,
        ticket_price: 2,
        is_trending: true,
      },
      {
        title: 'Viaje a Galápagos (ejemplo)',
        description: 'Sorteo de ejemplo solo para compra de boletos.',
        prize_description: 'Viaje para dos personas',
        prize_category: 'travel',
        start_date: now,
        end_date: inDays(30),
        draw_date: inDays(31),
        status: 'active',
        entry_mode: 'tickets_only',
        total_winners: 1,
        ticket_price: 5,
      },
    ],
  });

  console.log('✔ Sorteos de ejemplo creados');
}

async function main() {
  await seedLocations();
  await seedAdmin();
  await seedPlans();
  await seedPaymentMethods();
  await seedRaffles();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
