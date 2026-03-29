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
  retentionMonths: number;
};

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  BASIC: {
    maxEvents: 1,
    maxGuests: 100,
    maxStorageBytes: 10 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
    aiStoriesEnabled: false,
    retentionMonths: 1,
  },
  PREMIUM: {
    maxEvents: 1,
    maxGuests: 300,
    maxStorageBytes: 50 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 100 * 1024 * 1024,
    aiStoriesEnabled: true,
    retentionMonths: 3,
  },
  LUXURY: {
    maxEvents: 1,
    maxGuests: 500,
    maxStorageBytes: 200 * 1024 * 1024 * 1024,
    maxFileSizeBytes: 300 * 1024 * 1024,
    aiStoriesEnabled: true,
    retentionMonths: 6,
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

export const parseNullableTier = (value: unknown): Tier | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const legacyAlias = LEGACY_TIER_ALIASES[normalized];
  if (legacyAlias) {
    return legacyAlias;
  }

  return TIERS.find((tier) => tier === normalized) ?? null;
};

export const getTierRetentionMonths = (value: unknown) => {
  const tier = parseTier(value) ?? 'BASIC';
  return TIER_LIMITS[tier].retentionMonths;
};

export const getEventExpirationDate = (eventDate: Date, value: unknown) => {
  const expiresAt = new Date(eventDate);
  expiresAt.setMonth(expiresAt.getMonth() + getTierRetentionMonths(value));
  return expiresAt;
};
