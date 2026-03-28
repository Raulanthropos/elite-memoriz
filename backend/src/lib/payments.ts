import Stripe from 'stripe';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { parseTier, type Tier } from './tiers';

export type PaymentStatus = (typeof schema.paymentStatuses)[number];
export type PaymentOverviewStatus = PaymentStatus | 'NOT_STARTED';
export type PaymentPurchaseRecord = typeof schema.paymentPurchases.$inferSelect;

const STRIPE_PRICE_ID_ENV: Record<Tier, string> = {
  BASIC: 'STRIPE_PRICE_ID_BASIC',
  PREMIUM: 'STRIPE_PRICE_ID_PREMIUM',
  LUXURY: 'STRIPE_PRICE_ID_LUXURY',
};

let stripeClient: Stripe | null = null;

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getStripeClient = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'));
  }

  return stripeClient;
};

export const getStripeWebhookSecret = () => getRequiredEnv('STRIPE_WEBHOOK_SECRET');

export const getStripePriceId = (tier: Tier) => getRequiredEnv(STRIPE_PRICE_ID_ENV[tier]);

export const getFrontendAppUrl = () => getRequiredEnv('FRONTEND_URL').replace(/\/+$/, '');

export const getCreationPathForTier = (tier: Tier) =>
  `/create-event?tier=${encodeURIComponent(tier)}&source=payment`;

export const getLatestPurchaseForUser = async (userId: string) => {
  const [purchase] = await db
    .select()
    .from(schema.paymentPurchases)
    .where(eq(schema.paymentPurchases.userId, userId))
    .orderBy(desc(schema.paymentPurchases.createdAt), desc(schema.paymentPurchases.id))
    .limit(1);

  return purchase ?? null;
};

export const getLatestPaidPurchaseForUser = async (userId: string) => {
  const [purchase] = await db
    .select()
    .from(schema.paymentPurchases)
    .where(
      and(
        eq(schema.paymentPurchases.userId, userId),
        eq(schema.paymentPurchases.paymentStatus, 'PAID')
      )
    )
    .orderBy(desc(schema.paymentPurchases.paidAt), desc(schema.paymentPurchases.id))
    .limit(1);

  return purchase ?? null;
};

export const getPurchaseBySessionId = async (sessionId: string) => {
  const [purchase] = await db
    .select()
    .from(schema.paymentPurchases)
    .where(eq(schema.paymentPurchases.stripeCheckoutSessionId, sessionId))
    .limit(1);

  return purchase ?? null;
};

const getTierFromPurchaseRecord = (purchase: PaymentPurchaseRecord | null) => {
  if (!purchase) {
    return null;
  }

  return parseTier(purchase.unlockedTier ?? purchase.selectedTier);
};

export const getPaymentOverview = async (userId: string) => {
  const [latestPaidPurchase, latestPurchase] = await Promise.all([
    getLatestPaidPurchaseForUser(userId),
    getLatestPurchaseForUser(userId),
  ]);

  const entitledTier = getTierFromPurchaseRecord(latestPaidPurchase);
  const activePurchase = latestPaidPurchase ?? latestPurchase;
  const latestSelectedTier = parseTier(activePurchase?.selectedTier);

  return {
    hasPaidTier: Boolean(entitledTier),
    entitledTier,
    latestSelectedTier,
    latestPaymentStatus: activePurchase?.paymentStatus ?? 'NOT_STARTED' as PaymentOverviewStatus,
    latestCheckoutSessionId: activePurchase?.stripeCheckoutSessionId ?? null,
    creationPath: entitledTier ? getCreationPathForTier(entitledTier) : null,
  };
};
