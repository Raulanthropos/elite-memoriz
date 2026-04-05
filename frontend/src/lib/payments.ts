import { API_URL } from './config';
import { supabase } from './supabase';
import { parseNullableTier, type Tier } from './tiers';

export type PaymentOverviewStatus = 'NOT_STARTED' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export type PaymentOverview = {
  hasPaidTier: boolean;
  entitledTier: Tier | null;
  latestSelectedTier: Tier | null;
  latestPaymentStatus: PaymentOverviewStatus;
  latestPurchaseId: number | null;
  latestPaymentMethodType: string | null;
  creationPath: string | null;
};

export type PaymentQuote = {
  tier: Tier;
  amount: number;
  currency: string;
};

export type PurchaseStatus = {
  purchaseId: number;
  selectedTier: Tier | null;
  unlockedTier: Tier | null;
  paymentStatus: Exclude<PaymentOverviewStatus, 'NOT_STARTED'>;
  paymentMethodType: string;
  isUnlocked: boolean;
  creationPath: string | null;
};

export type PaymentSession = {
  purchaseId: number;
  publicKey: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'iris';
  signature?: string;
};

export type ChargeResult = {
  success: boolean;
  purchaseId: number;
  paymentStatus: string;
  isUnlocked: boolean;
  creationPath: string | null;
  message?: string;
};

type PaymentOverviewResponse = Omit<PaymentOverview, 'entitledTier' | 'latestSelectedTier'> & {
  entitledTier: string | null;
  latestSelectedTier: string | null;
};

type PaymentQuoteResponse = Omit<PaymentQuote, 'tier'> & {
  tier: string;
};

type PurchaseStatusResponse = Omit<PurchaseStatus, 'selectedTier' | 'unlockedTier'> & {
  selectedTier: string | null;
  unlockedTier: string | null;
};

type ApiError = {
  message?: string;
};

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Please sign in to continue.');
  }

  return session.access_token;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => null)) as T | ApiError | null;

  if (!response.ok) {
    throw new Error((payload as ApiError | null)?.message || 'Request failed');
  }

  return payload as T;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const fetchPaymentOverview = async (): Promise<PaymentOverview> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/payments/status`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await parseJsonResponse<PaymentOverviewResponse>(response);

  return {
    ...payload,
    entitledTier: parseNullableTier(payload.entitledTier),
    latestSelectedTier: parseNullableTier(payload.latestSelectedTier),
  };
};

export const fetchPaymentQuote = async (tier: Tier): Promise<PaymentQuote> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/payments/quote?tier=${encodeURIComponent(tier)}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await parseJsonResponse<PaymentQuoteResponse>(response);

  return {
    ...payload,
    tier: parseNullableTier(payload.tier) ?? tier,
  };
};

export const createPaymentSession = async (
  tier: Tier,
  paymentMethod: 'card' | 'iris' = 'card',
): Promise<PaymentSession> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/payments/create-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tier, paymentMethod }),
  });

  return parseJsonResponse<PaymentSession>(response);
};

export const chargeCardToken = async (
  purchaseId: number,
  token: string,
): Promise<ChargeResult> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/payments/charge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ purchaseId, token }),
  });

  return parseJsonResponse<ChargeResult>(response);
};

export const fetchPurchaseStatus = async (purchaseId: number): Promise<PurchaseStatus> => {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${API_URL}/api/payments/purchase-status?purchase_id=${encodeURIComponent(String(purchaseId))}`,
    {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const payload = await parseJsonResponse<PurchaseStatusResponse>(response);

  return {
    ...payload,
    selectedTier: parseNullableTier(payload.selectedTier),
    unlockedTier: parseNullableTier(payload.unlockedTier),
  };
};

// ---------------------------------------------------------------------------
// IRIS localStorage helpers
// ---------------------------------------------------------------------------

const IRIS_PENDING_KEY = 'everypay_iris_pending';

export type IrisPending = {
  purchaseId: number;
  tier: string;
  timestamp: number;
};

export const storeIrisPending = (purchaseId: number, tier: string) => {
  const value: IrisPending = { purchaseId, tier, timestamp: Date.now() };
  localStorage.setItem(IRIS_PENDING_KEY, JSON.stringify(value));
};

export const getIrisPending = (): IrisPending | null => {
  try {
    const raw = localStorage.getItem(IRIS_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IrisPending;
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > ONE_HOUR) {
      localStorage.removeItem(IRIS_PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(IRIS_PENDING_KEY);
    return null;
  }
};

export const clearIrisPending = () => {
  localStorage.removeItem(IRIS_PENDING_KEY);
};
