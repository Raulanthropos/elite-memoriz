export const TIERS = ['BASIC', 'PREMIUM', 'LUXURY'] as const;
const LEGACY_TIER_ALIASES: Record<string, Tier> = {
  FREE: 'BASIC',
  VIP: 'LUXURY',
};

export type Tier = (typeof TIERS)[number];

type TierLimits = {
  maxEvents: number;
  maxGuests: number;
  maxUploads: number;
  maxStorageBytes: number;
};

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  BASIC: {
    maxEvents: 1,
    maxGuests: 100,
    maxUploads: 20,
    maxStorageBytes: 100 * 1024 * 1024,
  },
  PREMIUM: {
    maxEvents: Number.POSITIVE_INFINITY,
    maxGuests: Number.POSITIVE_INFINITY,
    maxUploads: 100,
    maxStorageBytes: 500 * 1024 * 1024,
  },
  LUXURY: {
    maxEvents: Number.POSITIVE_INFINITY,
    maxGuests: Number.POSITIVE_INFINITY,
    maxUploads: Number.POSITIVE_INFINITY,
    maxStorageBytes: 2 * 1024 * 1024 * 1024,
  },
};

export const parseTier = (value: unknown): Tier | null => {
  if (value == null) {
    return 'BASIC';
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return 'BASIC';
  }

  const legacyAlias = LEGACY_TIER_ALIASES[normalized];
  if (legacyAlias) {
    return legacyAlias;
  }

  return TIERS.find((tier) => tier === normalized) ?? null;
};
