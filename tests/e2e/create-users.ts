/** Crea usuarios de prueba (staff y dos participantes) en la base indicada por DATABASE_URL */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const users = [
  { email: 'staff@test.local', role: 'staff', cedula: '1710034065' },
  { email: 'ana@test.local', role: 'participant', cedula: '0102030405' },
  { email: 'beto@test.local', role: 'participant', cedula: '0912345674' },
];
async function main() {
  const hash = await bcrypt.hash('Clave12345', 10);
  for (const u of users) {
    await prisma.users.create({ data: { email: u.email, password_hash: hash, profile: { create: { full_name: `${u.role} ${u.email.split('@')[0]} Prueba`, id_number: u.cedula, phone_number: '+593991234567', email: u.email, address: 'Quito', role: u.role, referral_code: u.email.slice(0,4).toUpperCase() + 'REF1' } } } });
  }
  console.log('ok');
}
main().finally(() => prisma.$disconnect());
