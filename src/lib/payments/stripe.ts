import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe secret key is not configured.');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2024-04-10',
  });

  return stripeClient;
}

