import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { parseNullableTier, parseTier, type Tier } from './tiers';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
export type PaymentOverviewStatus = PaymentStatus | 'NOT_STARTED';
export type PaymentMethodType = 'card' | 'iris';

export type TierPriceQuote = {
  amount: number;
  currency: string;
};

export type PurchaseRecord = {
  id: number;
  user_id: string;
  selected_tier: string;
  unlocked_tier: string | null;
  payment_method_type: string;
  everypay_payment_token: string | null;
  everypay_customer_email: string | null;
  payment_status: string;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

const PENDING_PURCHASE_TTL_MS = 5 * 60 * 1000;
export const EXPIRED_PENDING_PURCHASE_MESSAGE =
  'This payment session expired before confirmation. Please try again.';

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// ---------------------------------------------------------------------------
// Supabase client (service-role, shared across payment operations)
// ---------------------------------------------------------------------------

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }
  return supabaseClient;
};

// ---------------------------------------------------------------------------
// EveryPay configuration
// ---------------------------------------------------------------------------

export const getEveryPaySecretKey = () => getRequiredEnv('EVERYPAY_SECRET_KEY');
export const getEveryPayPublicKey = () => getRequiredEnv('EVERYPAY_PUBLIC_KEY');
export const getEveryPaySharedKey = () => getRequiredEnv('EVERYPAY_SHARED_KEY');

export const getEveryPayApiUrl = () =>
  process.env.EVERYPAY_API_URL?.trim() || 'https://sandbox-api.everypay.gr';

export const getEveryPayCallbackUrl = () => getRequiredEnv('EVERYPAY_CALLBACK_URL');

// ---------------------------------------------------------------------------
// Tier pricing (amount in cents, EUR)
// ---------------------------------------------------------------------------
// 4556940988073158
// 5217925525906273

export const getTierPrice = (tier: Tier): TierPriceQuote => {
  const prices: Record<Tier, number> = {
    BASIC: Number(process.env.TIER_PRICE_BASIC) || 2900,
    PREMIUM: Number(process.env.TIER_PRICE_PREMIUM) || 7900,
    LUXURY: Number(process.env.TIER_PRICE_LUXURY) || 12900,
  };
  return { amount: prices[tier], currency: 'EUR' };
};

// ---------------------------------------------------------------------------
// Frontend URL resolution (kept from original)
// ---------------------------------------------------------------------------

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');

const isPrivateIpv4Hostname = (hostname: string) => {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!match) return false;
  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
};

const isDevelopmentFrontendOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
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

// ---------------------------------------------------------------------------
// EveryPay API helpers
// ---------------------------------------------------------------------------

const everyPayRequest = async (
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, string>,
): Promise<any> => {
  const url = `${getEveryPayApiUrl()}${path}`;
  const auth = Buffer.from(`${getEveryPaySecretKey()}:`).toString('base64');

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(body ? { body: new URLSearchParams(body).toString() } : {}),
  };

  const response = await fetch(url, options);
  const data: any = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message ?? `EveryPay API error (${response.status})`;
    const err = new Error(msg) as Error & { statusCode: number; everypayError: any };
    err.statusCode = response.status;
    err.everypayError = data?.error;
    throw err;
  }

  return data;
};

/**
 * Charge a card token (ctn_*) or IRIS source token (src_*) via EveryPay.
 * Returns the full payment object on success (status === "Captured").
 */
export const chargeToken = async (
  token: string,
  amount: number,
  description: string,
  payeeEmail?: string,
  metadata?: Record<string, string>,
) => {
  const body: Record<string, string> = {
    token,
    amount: String(amount),
    description,
  };

  if (payeeEmail) body.payee_email = payeeEmail;

  if (metadata) {
    for (const [k, v] of Object.entries(metadata)) {
      body[`metadata[${k}]`] = v;
    }
  }

  return everyPayRequest('POST', '/payments', body);
};

/** Create an IRIS session and return the response (contains `signature`). */
export const createIrisSession = async (
  amount: number,
  currency: string,
  callbackUrl: string,
  md: string,
) => {
  return everyPayRequest('POST', '/iris/sessions', {
    amount: String(amount),
    currency: currency.toUpperCase(),
    country: 'GR',
    callback_url: callbackUrl,
    md,
  });
};

/** Retrieve an existing EveryPay payment by its token (pmt_*). */
export const retrievePayment = async (paymentToken: string) => {
  return everyPayRequest('GET', `/payments/${paymentToken}`);
};

// ---------------------------------------------------------------------------
// IRIS hash verification (HMAC-SHA256)
// ---------------------------------------------------------------------------

export const verifyIrisHash = (
  receivedHash: string,
): { valid: boolean; payload: Record<string, unknown> | null } => {
  try {
    const decoded = Buffer.from(receivedHash, 'base64').toString('utf8');
    const separatorIdx = decoded.indexOf('|');
    if (separatorIdx === -1) return { valid: false, payload: null };

    const hmacPart = decoded.substring(0, separatorIdx);
    const jsonPart = decoded.substring(separatorIdx + 1);

    const computed = createHmac('sha256', getEveryPaySharedKey())
      .update(jsonPart)
      .digest('hex');

    if (hmacPart !== computed) return { valid: false, payload: null };

    return { valid: true, payload: JSON.parse(jsonPart) };
  } catch {
    return { valid: false, payload: null };
  }
};

// ---------------------------------------------------------------------------
// Database helpers (Supabase JS – bypasses Drizzle at runtime)
// ---------------------------------------------------------------------------

export const ensureHostProfile = async (userId: string, email: string) => {
  const { error } = await getSupabaseClient()
    .from('profiles')
    .upsert(
      { id: userId, email, role: 'host', tier: 'BASIC' },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  if (error) throw error;
};

export const insertPendingPurchase = async (params: {
  userId: string;
  selectedTier: string;
  paymentMethodType: string;
  customerEmail: string;
}) => {
  const now = new Date();

  const { data, error } = await getSupabaseClient()
    .from('payment_purchases')
    .insert({
      user_id: params.userId,
      selected_tier: params.selectedTier,
      payment_method_type: params.paymentMethodType,
      everypay_customer_email: params.customerEmail,
      payment_status: 'PENDING',
      expires_at: new Date(now.getTime() + PENDING_PURCHASE_TTL_MS).toISOString(),
      updated_at: now.toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: number };
};

export const markPurchasePaid = async (
  purchaseId: number,
  paymentToken: string,
  tier: string,
  userId: string,
  userEmail: string,
) => {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data: updatedPurchase, error: purchaseError } = await supabase
    .from('payment_purchases')
    .update({
      payment_status: 'PAID',
      unlocked_tier: tier,
      everypay_payment_token: paymentToken,
      paid_at: now,
      updated_at: now,
    })
    .eq('id', purchaseId)
    .eq('payment_status', 'PENDING')
    .select('*')
    .maybeSingle();

  if (purchaseError) throw purchaseError;
  if (!updatedPurchase) {
    throw new Error(`Purchase ${purchaseId} is no longer pending`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, email: userEmail, role: 'host', tier },
      { onConflict: 'id' },
    );

  if (profileError) throw profileError;

  return updatedPurchase as PurchaseRecord;
};

export const markPurchaseFailed = async (purchaseId: number) => {
  const { data, error } = await getSupabaseClient()
    .from('payment_purchases')
    .update({
      payment_status: 'FAILED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .eq('payment_status', 'PENDING')
    .select('*')
    .maybeSingle();

  if (error) throw error;

  return data as PurchaseRecord | null;
};

export const getPurchaseById = async (
  purchaseId: number,
): Promise<PurchaseRecord | null> => {
  const { data, error } = await getSupabaseClient()
    .from('payment_purchases')
    .select('*')
    .eq('id', purchaseId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const isPendingPurchaseExpired = (purchase: PurchaseRecord, now = new Date()) => {
  if (purchase.payment_status !== 'PENDING' || !purchase.expires_at) {
    return false;
  }

  // IRIS bank transfers are confirmed asynchronously by EveryPay's webhook,
  // potentially well after our 5-minute UI staleness window. Auto-failing
  // them from a polling read path would race the webhook and silently drop
  // a successful payment, so we never expire IRIS purchases here — only the
  // webhook is authoritative for that flow.
  if (purchase.payment_method_type === 'iris') {
    return false;
  }

  const expiresAt = new Date(purchase.expires_at);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return now.getTime() > expiresAt.getTime();
};

export const resolveExpiredPendingPurchase = async (purchase: PurchaseRecord | null) => {
  if (!purchase || !isPendingPurchaseExpired(purchase)) {
    return {
      purchase,
      didExpire: false,
      message: null as string | null,
    };
  }

  const updatedPurchase = await markPurchaseFailed(purchase.id);
  const latestPurchase = updatedPurchase ?? (await getPurchaseById(purchase.id));

  if (latestPurchase?.payment_status === 'PAID') {
    return {
      purchase: latestPurchase,
      didExpire: false,
      message: null as string | null,
    };
  }

  return {
    purchase: latestPurchase ?? { ...purchase, payment_status: 'FAILED', updated_at: new Date().toISOString() },
    didExpire: true,
    message: EXPIRED_PENDING_PURCHASE_MESSAGE,
  };
};

export const getLatestPaidPurchaseForUser = async (userId: string) => {
  const { data, error } = await getSupabaseClient()
    .from('payment_purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('payment_status', 'PAID')
    .order('paid_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id as number,
    userId: data.user_id as string,
    selectedTier: data.selected_tier as string,
    unlockedTier: data.unlocked_tier as string | null,
    paymentMethodType: data.payment_method_type as string,
    paymentStatus: data.payment_status as string,
    paidAt: data.paid_at as string | null,
  };
};

export const getLatestPendingPurchaseForUser = async (
  userId: string,
): Promise<PurchaseRecord | null> => {
  const { data, error } = await getSupabaseClient()
    .from('payment_purchases')
    .select('*')
    .eq('user_id', userId)
    .eq('payment_status', 'PENDING')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const resolvedPurchase = await resolveExpiredPendingPurchase(data as PurchaseRecord | null);

  if (resolvedPurchase.purchase?.payment_status !== 'PENDING') {
    return null;
  }

  return resolvedPurchase.purchase;
};

export const getPaymentOverview = async (userId: string) => {
  const supabase = getSupabaseClient();

  const [paidResult, latestResult] = await Promise.all([
    supabase
      .from('payment_purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('payment_status', 'PAID')
      .order('paid_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('payment_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (paidResult.error) throw paidResult.error;
  if (latestResult.error) throw latestResult.error;

  const latestPaidPurchase = paidResult.data as PurchaseRecord | null;
  const latestPurchaseResult = await resolveExpiredPendingPurchase(latestResult.data as PurchaseRecord | null);
  const latestPurchase = latestPurchaseResult.purchase;

  const entitledTier = latestPaidPurchase
    ? (parseNullableTier(latestPaidPurchase.unlocked_tier) ?? parseNullableTier(latestPaidPurchase.selected_tier))
    : null;

  const activePurchase = latestPaidPurchase ?? latestPurchase;
  const latestSelectedTier = activePurchase ? parseTier(activePurchase.selected_tier) : null;

  return {
    hasPaidTier: Boolean(entitledTier),
    entitledTier,
    latestSelectedTier,
    latestPaymentStatus: (activePurchase?.payment_status ?? 'NOT_STARTED') as PaymentOverviewStatus,
    latestPurchaseId: activePurchase?.id ?? null,
    latestPaymentMethodType: activePurchase?.payment_method_type ?? null,
    latestStatusMessage: !latestPaidPurchase ? latestPurchaseResult.message : null,
    creationPath: entitledTier ? getCreationPathForTier(entitledTier) : null,
  };
};
