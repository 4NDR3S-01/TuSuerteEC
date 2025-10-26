import { Database } from './database';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Profile types
export type Profile = Tables<'profiles'>;
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Plan types
export type Plan = Tables<'plans'>;
export type PlanInsert = Database['public']['Tables']['plans']['Insert'];
export type PlanUpdate = Database['public']['Tables']['plans']['Update'];

// Subscription types
export type Subscription = Tables<'subscriptions'>;
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

// Raffle types
export type Raffle = Tables<'raffles'>;
export type RaffleInsert = Database['public']['Tables']['raffles']['Insert'];
export type RaffleUpdate = Database['public']['Tables']['raffles']['Update'];

// Raffle Entry types
export type RaffleEntry = Tables<'raffle_entries'>;
export type RaffleEntryInsert = Database['public']['Tables']['raffle_entries']['Insert'];
export type RaffleEntryUpdate = Database['public']['Tables']['raffle_entries']['Update'];

// Winner types
export type Winner = Tables<'winners'>;
export type WinnerInsert = Database['public']['Tables']['winners']['Insert'];
export type WinnerUpdate = Database['public']['Tables']['winners']['Update'];

// Live Event types
export type LiveEvent = Tables<'live_events'>;
export type LiveEventInsert = Database['public']['Tables']['live_events']['Insert'];
export type LiveEventUpdate = Database['public']['Tables']['live_events']['Update'];

// Payment Transaction types (nueva tabla)
export type PaymentTransaction = Tables<'payment_transactions'>;
export type PaymentTransactionInsert = Database['public']['Tables']['payment_transactions']['Insert'];
export type PaymentTransactionUpdate = Database['public']['Tables']['payment_transactions']['Update'];

// Payment Method types
export type PaymentMethod = Tables<'payment_methods'>;
export type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert'];
export type PaymentMethodUpdate = Database['public']['Tables']['payment_methods']['Update'];

// Location types
export type Country = Tables<'countries'>;
export type City = Tables<'cities'>;
export type Parish = Tables<'parishes'>;

// Extended types with relations
export type RaffleWithCreator = Raffle & {
  profiles?: Pick<Profile, 'full_name'>;
};

export type SubscriptionWithPlan = Subscription & {
  plans: Plan;
};

export type RaffleEntryWithRaffle = RaffleEntry & {
  raffles: Raffle;
};

export type WinnerWithRaffle = Winner & {
  raffles: Pick<Raffle, 'title'>;
};

export type LiveEventWithRaffle = LiveEvent & {
  raffles?: Pick<Raffle, 'title'>;
};
