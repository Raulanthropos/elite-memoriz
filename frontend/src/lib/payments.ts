import { API_URL } from './config';
import { supabase } from './supabase';
import { parseNullableTier, type Tier } from './tiers';

export type PaymentOverviewStatus = 'NOT_STARTED' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export type PaymentOverview = {
  hasPaidTier: boolean;
  entitledTier: Tier | null;
  latestSelectedTier: Tier | null;
  latestPaymentStatus: PaymentOverviewStatus;
  latestCheckoutSessionId: string | null;
  creationPath: string | null;
};

export type CheckoutSessionStatus = {
  sessionId: string;
  selectedTier: Tier | null;
  unlockedTier: Tier | null;
  paymentStatus: Exclude<PaymentOverviewStatus, 'NOT_STARTED'>;
  isUnlocked: boolean;
  creationPath: string | null;
  stripeCheckoutStatus: string | null;
  stripePaymentStatus: string | null;
};

type PaymentOverviewResponse = Omit<PaymentOverview, 'entitledTier' | 'latestSelectedTier'> & {
  entitledTier: string | null;
  latestSelectedTier: string | null;
};

type CheckoutSessionStatusResponse = Omit<CheckoutSessionStatus, 'selectedTier' | 'unlockedTier'> & {
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

export const fetchPaymentOverview = async (): Promise<PaymentOverview> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/payments/status`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await parseJsonResponse<PaymentOverviewResponse>(response);

  return {
    ...payload,
    entitledTier: parseNullableTier(payload.entitledTier),
    latestSelectedTier: parseNullableTier(payload.latestSelectedTier),
  };
};

export const createCheckoutSession = async (tier: Tier) => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/api/payments/checkout-sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tier }),
  });

  return parseJsonResponse<{
    sessionId: string;
    checkoutUrl: string;
  }>(response);
};

export const fetchCheckoutSessionStatus = async (sessionId: string): Promise<CheckoutSessionStatus> => {
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${API_URL}/api/payments/checkout-session-status?session_id=${encodeURIComponent(sessionId)}`,
    {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const payload = await parseJsonResponse<CheckoutSessionStatusResponse>(response);

  return {
    ...payload,
    selectedTier: parseNullableTier(payload.selectedTier),
    unlockedTier: parseNullableTier(payload.unlockedTier),
  };
};
