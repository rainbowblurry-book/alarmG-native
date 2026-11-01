/**
 * Feature registry: which features are free and which will be premium later.
 * Everything is unlocked for now (no billing yet, DECISIONS D-06). Screens show a
 * small PRO tag on premium items so it is clear what would be paid.
 */
import type { PackId } from '../theme/packs';

export type FeatureId = 'mornings' | 'multiAlarms' | 'wakeCheck';
export type Tier = 'free' | 'premium';

export const FEATURES: Record<FeatureId, { name: string; tier: Tier }> = {
  mornings: { name: 'Mornings history', tier: 'premium' },
  multiAlarms: { name: 'More than one alarm', tier: 'premium' },
  wakeCheck: { name: 'Wake-up check', tier: 'premium' },
};

/** Lumen is the free default design; the others are premium. */
export const PACK_TIER: Record<PackId, Tier> = { lumen: 'free', paper: 'premium', field: 'premium', signal: 'premium' };

export function isFeatureUnlocked(_id: FeatureId): boolean {
  return true;
}

export const isPremium = (id: FeatureId) => FEATURES[id].tier === 'premium';
