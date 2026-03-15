export const TIERS = ['BASIC', 'PREMIUM', 'LUXURY'] as const;

export type Tier = (typeof TIERS)[number];

export const parseTier = (value: unknown): Tier | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toUpperCase();
  return TIERS.find((tier) => tier === normalized) ?? null;
};

export const getTierBadge = (value: unknown) => {
  const tier = parseTier(value);

  if (tier === 'BASIC') {
    return { label: 'BASIC', css: 'bg-black text-white border-gray-700/50' };
  }

  if (tier === 'PREMIUM') {
    return { label: 'PREMIUM', css: 'bg-green-600 text-white border-green-500/50' };
  }

  if (tier === 'LUXURY') {
    return { label: 'LUXURY', css: 'bg-red-600 text-white border-red-500/50' };
  }

  return { label: 'INVALID', css: 'bg-amber-700 text-white border-amber-500/50' };
};

export const getTierBannerBadge = (value: unknown) => {
  const tier = parseTier(value);

  if (tier === 'BASIC') {
    return { label: 'BASIC', css: 'bg-black text-white border border-gray-700' };
  }

  if (tier === 'PREMIUM') {
    return { label: 'PREMIUM', css: 'bg-green-600 text-white border border-green-500' };
  }

  if (tier === 'LUXURY') {
    return { label: 'LUXURY', css: 'bg-red-600 text-white border border-red-500' };
  }

  return { label: 'INVALID', css: 'bg-amber-700 text-white border border-amber-500' };
};
