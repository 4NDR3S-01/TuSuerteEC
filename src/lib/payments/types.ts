// Tipos de métodos de pago. Por ahora solo pagos manuales (transferencia y QR) aprobados por el admin.
// Para agregar una pasarela (p. ej. Payphone) se añade un nuevo tipo aquí y su configuración.
export type PaymentMethodType = 'manual_transfer' | 'qr_code';

export type PaymentScope = 'raffles' | 'plans';

export type PaymentMethodConfig = {
  scopes?: PaymentScope[];
  currency?: string;
  // Transferencia bancaria: datos completos de la cuenta
  manual?: {
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    beneficiary?: string;
    identification?: string;
    instructions?: string;
    requiresProof?: boolean; // Si requiere comprobante de pago
  };
  // Código QR (Deuna, Binance, etc.)
  qr?: {
    provider?: string;
    qrImageUrl?: string;
    accountId?: string;
    accountName?: string;
    instructions?: string;
    requiresProof?: boolean; // Si requiere comprobante de pago
  };
};

export type PaymentMethod = {
  id: string;
  name: string;
  type: PaymentMethodType;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  instructions: string | null;
  config: PaymentMethodConfig | null;
  created_at: string;
  updated_at: string | null;
};

export const MANUAL_PAYMENT_TYPES: readonly string[] = ['manual_transfer', 'qr_code'];
