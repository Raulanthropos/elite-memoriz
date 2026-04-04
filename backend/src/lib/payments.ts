import Stripe from 'stripe';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { parseNullableTier, parseTier, type Tier } from './tiers';

export type PaymentStatus = (typeof schema.paymentStatuses)[number];
export type PaymentOverviewStatus = PaymentStatus | 'NOT_STARTED';
export type PaymentPurchaseRecord = typeof schema.paymentPurchases.$inferSelect;
export type TierPriceQuote = {
  amount: number;
  currency: string;
  priceId: string;
};

const STRIPE_PRICE_ID_ENV: Record<Tier, string> = {
  BASIC: 'STRIPE_PRICE_ID_BASIC',
  PREMIUM: 'STRIPE_PRICE_ID_PREMIUM',
  LUXURY: 'STRIPE_PRICE_ID_LUXURY',
};

let stripeClient: Stripe | null = null;
const tierPriceCache = new Map<Tier, TierPriceQuote>();

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

export const getStripeTierPrice = async (tier: Tier): Promise<TierPriceQuote> => {
  const cached = tierPriceCache.get(tier);
  if (cached) {
    return cached;
  }

  const price = await getStripeClient().prices.retrieve(getStripePriceId(tier));

  if (price.type !== 'one_time' || price.unit_amount == null || !price.currency) {
    throw new Error(`Stripe price ${price.id} must be a one-time price with unit_amount and currency`);
  }

  const nextQuote: TierPriceQuote = {
    amount: price.unit_amount,
    currency: price.currency,
    priceId: price.id,
  };

  tierPriceCache.set(tier, nextQuote);
  return nextQuote;
};

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');

const isPrivateIpv4Hostname = (hostname: string) => {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
};

const isDevelopmentFrontendOrigin = (origin: string) => {
  try {
    const url = new URL(origin);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return (
      hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1'
      || isPrivateIpv4Hostname(hostname)
    );
  } catch {
    return false;
  }
};

export const getFrontendAppUrl = (requestOrigin?: string | null) => {
  if (process.env.NODE_ENV !== 'production' && requestOrigin && isDevelopmentFrontendOrigin(requestOrigin)) {
    return normalizeUrl(requestOrigin);
  }

  return normalizeUrl(getRequiredEnv('FRONTEND_URL'));
};

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

export const getPurchaseByPaymentIntentId = async (paymentIntentId: string) => {
  const [purchase] = await db
    .select()
    .from(schema.paymentPurchases)
    .where(eq(schema.paymentPurchases.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  return purchase ?? null;
};

export const getPurchaseById = async (purchaseId: number) => {
  const [purchase] = await db
    .select()
    .from(schema.paymentPurchases)
    .where(eq(schema.paymentPurchases.id, purchaseId))
    .limit(1);

  return purchase ?? null;
};

const getTierFromPurchaseRecord = (purchase: PaymentPurchaseRecord | null) => {
  if (!purchase) {
    return null;
  }

  return parseNullableTier(purchase.unlockedTier) ?? parseNullableTier(purchase.selectedTier);
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
    latestPurchaseId: activePurchase?.id ?? null,
    latestCheckoutSessionId: activePurchase?.stripeCheckoutSessionId ?? null,
    latestPaymentIntentId: activePurchase?.stripePaymentIntentId ?? null,
    latestPaymentMethodType: activePurchase?.paymentMethodType ?? null,
    creationPath: entitledTier ? getCreationPathForTier(entitledTier) : null,
  };
};
