export type PaymentMethodType = 'stripe' | 'manual_transfer';

export type PaymentScope = 'raffles' | 'plans';

export type PaymentMethodConfig = {
  scopes?: PaymentScope[];
  currency?: string;
  amount?: number;
  stripe?: {
    priceId?: string;
    mode?: 'payment' | 'subscription';
    successPath?: string;
    cancelPath?: string;
  };
  manual?: {
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    beneficiary?: string;
    identification?: string;
    instructions?: string;
    referenceFormat?: string;
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

export type PaymentRecord = {
  id: string;
  user_id: string;
  raffle_id: string | null;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string | null;
  payment_method_id: string | null;
  transaction_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

