import { beforeEach, describe, expect, it } from 'vitest';
import { actAs, createUser, prisma, resetDatabase } from './helpers';
import { getCurrentUser } from '../../src/lib/auth/get-user';
import { createTeamMember, deleteUser, reactivateUser, suspendUser, updateUserRole } from '../../src/lib/actions/admin';
import { changePassword } from '../../src/lib/actions/auth';
import { registerUser, requestPasswordReset, resetPasswordWithToken } from '../../src/lib/actions/auth';
import { getMyNotifications, markNotificationsAsRead } from '../../src/lib/actions/notifications';
import { updateMyProfile } from '../../src/lib/actions/profile';
import { createRaffleEntries } from '../../src/lib/raffle/entries';
import { createRaffle } from './helpers';

beforeEach(resetDatabase);

describe('sesiones', () => {
  it('una sesión con versión antigua deja de ser válida', async () => {
    const user = await createUser();
    actAs(user, 0);
    expect(await getCurrentUser()).not.toBeNull();
    await prisma.users.update({ where: { id: user.id }, data: { session_version: 1 } });
    expect(await getCurrentUser()).toBeNull();
  });

  it('suspender cierra la sesión; solo el admin puede hacerlo y no puede suspenderse a sí mismo', async () => {
    const admin = await createUser('admin');
    const staff = await createUser('staff');
    const target = await createUser();

    actAs(staff);
    expect((await suspendUser(target.id, 'fraude')).success).toBe(false);

    actAs(admin);
    expect((await suspendUser(admin.id, 'x')).success).toBe(false);
    expect((await suspendUser(target.id, '')).success).toBe(false);
    expect((await suspendUser(target.id, 'Comprobantes falsos')).success).toBe(true);

    actAs(target, 1);
    expect(await getCurrentUser()).toBeNull();

    actAs(admin);
    expect((await reactivateUser(target.id)).success).toBe(true);
    actAs(target, 1);
    expect(await getCurrentUser()).not.toBeNull();
  });

  it('cambiar el rol invalida la sesión y siempre queda un admin', async () => {
    const admin = await createUser('admin');
    const other = await createUser();
    actAs(admin);
    expect((await updateUserRole(admin.id, 'participant')).success).toBe(false);
    expect((await updateUserRole(other.id, 'superadmin')).success).toBe(false);
    expect((await updateUserRole(other.id, 'staff')).success).toBe(true);
    actAs({ ...other, role: 'participant' }, 0);
    expect(await getCurrentUser()).toBeNull();
  });

  it('no se eliminan cuentas con historial', async () => {
    const admin = await createUser('admin');
    const withHistory = await createUser();
    const clean = await createUser();
    const raffle = await createRaffle();
    await prisma.$transaction((tx) => createRaffleEntries(tx, { raffleId: raffle.id, userId: withHistory.id, entrySource: 'manual_purchase', count: 1 }));
    actAs(admin);
    expect((await deleteUser(withHistory.id)).success).toBe(false);
    expect((await deleteUser(clean.id)).success).toBe(true);
  });
});

describe('cuentas del equipo', () => {
  it('solo el admin crea staff, con contraseña temporal que debe cambiarse', async () => {
    const input = { fullName: 'Sara Staff Prueba', email: 'sara@test.local', idNumber: '1710034065', phoneNumber: '0991234567', role: 'staff' as const };
    actAs(await createUser('staff'));
    expect((await createTeamMember(input)).error).toBeTruthy();

    actAs(await createUser('admin'));
    const result = await createTeamMember(input);
    expect(result.error).toBeNull();
    expect(result.data?.temporaryPassword).toMatch(/^[A-Za-z]{8}[0-9]{3}-[0-9]$/);
    const account = await prisma.users.findUniqueOrThrow({ where: { email: 'sara@test.local' }, include: { profile: true } });
    expect(account.must_change_password).toBe(true);
    expect(account.profile?.role).toBe('staff');
    expect((await createTeamMember(input)).error).toMatch(/Ya existe/);

    actAs({ id: account.id, role: 'staff' });
    expect((await changePassword(result.data!.temporaryPassword, 'NuevaClave9')).success).toBe(true);
    expect((await prisma.users.findUniqueOrThrow({ where: { id: account.id } })).must_change_password).toBe(false);
  });
});

describe('registro y recuperación', () => {
  const base = {
    fullName: 'Ana Pérez',
    idNumber: '1710034065',
    phoneNumber: '0991234567',
    cityId: null,
    parishId: null,
    address: 'Av. Amazonas',
    email: 'ana@test.local',
    password: 'Segura123',
    acceptTerms: true,
  };

  it('exige aceptar términos, contraseña con letras y números y registra el referido', async () => {
    const referrer = await createUser();
    const code = (await prisma.profiles.findUniqueOrThrow({ where: { id: referrer.id } })).referral_code;
    expect((await registerUser({ ...base, acceptTerms: false })).success).toBe(false);
    expect((await registerUser({ ...base, password: 'solotexto' })).success).toBe(false);
    expect((await registerUser({ ...base, referralCode: code })).success).toBe(true);
    const profile = await prisma.profiles.findFirstOrThrow({ where: { email: base.email } });
    expect(profile.role).toBe('participant');
    expect(profile.referred_by).toBe(referrer.id);
    expect(profile.referral_code).toMatch(/^[A-Z0-9]{8}$/);
    expect((await registerUser({ ...base, email: 'otra@test.local' })).success).toBe(false);
  });

  it('el enlace de recuperación funciona una sola vez y cierra las sesiones', async () => {
    const user = await createUser();
    const logs: string[] = [];
    const original = console.info;
    console.info = (message: string) => logs.push(message);
    await requestPasswordReset(user.email);
    console.info = original;
    const token = /token=([0-9a-f]+)/.exec(logs.join('\n'))?.[1];
    expect(token).toBeTruthy();

    const results = await Promise.all([resetPasswordWithToken(token!, 'NuevaClave1'), resetPasswordWithToken(token!, 'OtraClave2')]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect((await prisma.users.findUniqueOrThrow({ where: { id: user.id } })).session_version).toBe(1);
  });
});

describe('aislamiento de datos', () => {
  it('nadie lee ni marca notificaciones ajenas', async () => {
    const [a, b] = [await createUser(), await createUser()];
    const note = await prisma.notifications.create({ data: { user_id: a.id, title: 'Privada', message: 'x' } });
    actAs(b);
    expect(await getMyNotifications()).toHaveLength(0);
    await markNotificationsAsRead([note.id]);
    expect((await prisma.notifications.findUniqueOrThrow({ where: { id: note.id } })).read).toBe(false);
  });

  it('cambiar el correo exige la contraseña actual', async () => {
    const user = await createUser();
    actAs(user);
    const result = await updateMyProfile({ email: 'nuevo@test.local', full_name: 'Nuevo', phone_number: '0999999999', address: 'Quito' });
    expect(result).toMatchObject({ success: false, field: 'currentPassword' });
    const ok = await updateMyProfile({ email: 'nuevo@test.local', full_name: 'Nuevo', phone_number: '0999999999', address: 'Quito', current_password: 'x' });
    expect(ok.success).toBe(true);
  });
});
