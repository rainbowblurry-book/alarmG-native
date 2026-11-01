/**
 * Single theme for the barebones build (DECISIONS D-23). The UI redesign will
 * revisit this; keep every screen reading colours from here, never hardcoded.
 */
export type GradientColors = readonly [string, string, ...string[]];

export interface ThemeConfig {
  name: string;
  fontFamily: string;
  background: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentText: string;
  ringingGradient: GradientColors;
}

export const SEMANTIC_COLORS = {
  warning: '#F59E0B',
  error: '#F43F5E',
  success: '#10B981',
};

export const THEME: ThemeConfig = {
  name: 'Minimal',
  fontFamily: 'PlusJakartaSans_600SemiBold',
  background: '#0B0F17',
  card: '#131A26',
  cardAlt: '#0E141F',
  border: '#1F2937',
  text: '#EAF0FA',
  textSecondary: '#93A2B8',
  accent: '#4F8EF7',
  accentText: '#FFFFFF',
  ringingGradient: ['#0B0F17', '#15243F', '#2C4D8F'],
};
