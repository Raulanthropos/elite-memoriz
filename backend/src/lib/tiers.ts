export const TIERS = ['BASIC', 'PREMIUM', 'LUXURY'] as const;
const LEGACY_TIER_ALIASES: Record<string, Tier> = {
  FREE: 'BASIC',
  VIP: 'LUXURY',
};

export type Tier = (typeof TIERS)[number];

export type TierLimits = {
  maxEvents: number;
  maxGuests: number;
  maxStorageBytes: number;
  maxFileSizeBytes: number;
  aiStoriesEnabled: boolean;
};

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  BASIC: {
    maxEvents: 1,
    maxGuests: 100,
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
    aiStoriesEnabled: false,
  },
  PREMIUM: {
    maxEvents: Number.POSITIVE_INFINITY,
    maxGuests: 300,
    maxStorageBytes: 50 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
    aiStoriesEnabled: true,
  },
  LUXURY: {
    maxEvents: Number.POSITIVE_INFINITY,
    maxGuests: 500,
    maxStorageBytes: 100 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 300 * 1024 * 1024,
    aiStoriesEnabled: true,
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
