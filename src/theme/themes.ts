export type ThemeId = 'minimal' | 'amber' | 'neon' | 'blossom' | 'obsidian';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  fontFamily: string;
  background: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentSecondary?: string;
  accentText: string;
  ringingGradient: string[];
  buttonGradient: string[];
  glassEffect?: boolean;
}

export const SEMANTIC_COLORS = {
  warning: '#F59E0B',
  error: '#F43F5E',
  success: '#10B981',
};

export const THEMES: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Ocean Slate',
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
    buttonGradient: ['#4F8EF7', '#4F8EF7'],
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    tagline: 'Desert Gold',
    fontFamily: 'Syne_700Bold',
    background: '#160F09',
    card: '#241708',
    cardAlt: '#1B1006',
    border: '#3A2410',
    text: '#FCEEDD',
    textSecondary: '#D8B48B',
    accent: '#F2A93B',
    accentText: '#1A1006',
    ringingGradient: ['#160F09', '#3B2107', '#8A4A12'],
    buttonGradient: ['#F2A93B', '#F2A93B'],
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    tagline: 'Cyber Pulse',
    fontFamily: 'Orbitron_700Bold',
    background: '#1C0B2B',
    card: '#2A1240',
    cardAlt: '#170A22',
    border: '#4A2A6B',
    text: '#FFFFFF',
    textSecondary: '#B39DDB',
    accent: '#FF4081',
    accentSecondary: '#D500F9',
    accentText: '#FFFFFF',
    ringingGradient: ['#1C0B2B', '#3D1A5C', '#6A1B9A'],
    buttonGradient: ['#D500F9', '#FF4081'],
    glassEffect: true,
  },
  blossom: {
    id: 'blossom',
    name: 'Blossom',
    tagline: 'Sakura Bloom',
    fontFamily: 'Comfortaa_700Bold',
    background: '#180F1A',
    card: '#241428',
    cardAlt: '#1B0F1E',
    border: '#3A2140',
    text: '#FCE9F5',
    textSecondary: '#D8AFCB',
    accent: '#F472B6',
    accentSecondary: '#C084FC',
    accentText: '#2A0F22',
    ringingGradient: ['#180F1A', '#3B1B36', '#6A2F58'],
    buttonGradient: ['#F472B6', '#F472B6'],
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    tagline: 'Crimson Vow',
    fontFamily: 'Cinzel_700Bold',
    background: '#0A0708',
    card: '#170D10',
    cardAlt: '#100809',
    border: '#361016',
    text: '#F5D9DE',
    textSecondary: '#B98891',
    accent: '#E11D48',
    accentSecondary: '#C9A15A',
    accentText: '#FFFFFF',
    ringingGradient: ['#0A0708', '#2B0910', '#5C0E1D'],
    buttonGradient: ['#E11D48', '#E11D48'],
  },
};

export const THEME_LIST: ThemeConfig[] = [
  THEMES.minimal,
  THEMES.amber,
  THEMES.neon,
  THEMES.blossom,
  THEMES.obsidian,
];

export const DEFAULT_THEME_ID: ThemeId = 'minimal';
