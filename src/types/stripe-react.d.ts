declare module '@stripe/react-stripe-js' {
  import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
  import type { ComponentType } from 'react';

  export const Elements: ComponentType<{ stripe: any; options?: StripeElementsOptions; children?: any }>;
  export const CardElement: ComponentType<any>;
  export function useStripe(): any;
  export function useElements(): any;
}
