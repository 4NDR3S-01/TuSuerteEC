import { describe, expect, it } from 'vitest';
import { PERMISSIONS, can, safeInternalPath } from '../../src/lib/auth/roles';
import { computeDiscountCents, normalizeDiscountCode } from '../../src/lib/marketing/discounts';
import { fromCents, toCents } from '../../src/lib/payments/money';
import { safeStoredFileUrl, sniffMimeType } from '../../src/lib/uploads';
import { validateEcuadorianId } from '../../src/lib/validators/ecuador-id';

describe('matriz de permisos', () => {
  it('el participante no tiene permisos operativos ni administrativos', () => {
    const allowed = (Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>).filter((p) => can('participant', p));
    expect(allowed).toEqual(['raffles.participate']);
  });

  it('el staff revisa pagos, ganadores y eventos, pero no administra ni ejecuta sorteos', () => {
    expect(can('staff', 'payments.review')).toBe(true);
    expect(can('staff', 'winners.manage')).toBe(true);
    expect(can('staff', 'live_events.manage')).toBe(true);
    for (const permission of ['raffles.manage', 'raffles.draw', 'plans.manage', 'payment_methods.manage', 'users.manage', 'discounts.manage', 'settings.manage', 'audit.view', 'reports.view'] as const) {
      expect(can('staff', permission)).toBe(false);
    }
  });

  it('el admin tiene todos los permisos y un rol desconocido ninguno', () => {
    (Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>).forEach((p) => {
      expect(can('admin', p)).toBe(true);
      expect(can('superuser', p)).toBe(false);
      expect(can(null, p)).toBe(false);
    });
  });
});

describe('redirecciones seguras', () => {
  it('solo acepta rutas internas', () => {
    expect(safeInternalPath('/app/sorteos')).toBe('/app/sorteos');
    expect(safeInternalPath('//evil.com')).toBeUndefined();
    expect(safeInternalPath('/\\evil.com')).toBeUndefined();
    expect(safeInternalPath('https://evil.com')).toBeUndefined();
    expect(safeInternalPath(undefined)).toBeUndefined();
  });
});

describe('dinero y descuentos', () => {
  it('convierte a centavos sin errores de coma flotante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99) * 3).toBe(5997);
    expect(fromCents(5997)).toBe(59.97);
  });

  it('calcula descuentos y nunca deja el total en cero', () => {
    expect(computeDiscountCents({ discount_type: 'percent', value: 10 }, 1000)).toBe(100);
    expect(computeDiscountCents({ discount_type: 'fixed', value: 2.5 }, 1000)).toBe(250);
    expect(computeDiscountCents({ discount_type: 'fixed', value: 50 }, 1000)).toBe(999);
    expect(computeDiscountCents({ discount_type: 'percent', value: 99 }, 100)).toBe(99);
  });

  it('normaliza los códigos', () => {
    expect(normalizeDiscountCode('  bien venida 10 ')).toBe('BIENVENIDA10');
  });
});

describe('archivos subidos', () => {
  it('detecta el tipo real por la firma del archivo', () => {
    expect(sniffMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffMimeType(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(sniffMimeType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffMimeType(new TextEncoder().encode('<html><script>'))).toBeNull();
  });

  it('solo acepta URLs de archivos propios de la carpeta esperada', () => {
    const url = '/api/files/raffle-prizes/0b1f7d2e-3c4a-4b5c-8d9e-0f1a2b3c4d5e.png';
    expect(safeStoredFileUrl(url, 'raffle-prizes')).toBe(url);
    expect(safeStoredFileUrl(url, 'payment-receipts')).toBeNull();
    expect(safeStoredFileUrl('https://evil.com/x.png', 'raffle-prizes')).toBeNull();
    expect(safeStoredFileUrl('/api/files/raffle-prizes/../../.env', 'raffle-prizes')).toBeNull();
    expect(safeStoredFileUrl('javascript:alert(1)', 'raffle-prizes')).toBeNull();
  });
});

describe('cédula ecuatoriana', () => {
  it('valida el dígito verificador', () => {
    expect(validateEcuadorianId('1710034065')).toBe(true);
    expect(validateEcuadorianId('1710034066')).toBe(false);
    expect(validateEcuadorianId('9999999999')).toBe(false);
    expect(validateEcuadorianId('12345')).toBe(false);
  });
});
