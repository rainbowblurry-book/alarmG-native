/**
 * Design packs: every visual value for the 4 designs lives here (one source of truth).
 * Screens read the active pack through useDesign(); they never hardcode colours.
 *
 * Colour sources (researched 2026-11-01, see docs/UI-PLAN.md "Colour notes"):
 * - Dark surfaces: warm/tinted near-black instead of #000 and off-white text instead of
 *   #FFF (Material dark-theme guidance: pure white "vibrates" on dark, pure black smears on OLED).
 * - Signal (retro): 90s desktop teal #008080 and the classic 3-D chrome greys
 *   #C0C0C0 / #808080 / #DFDFDF; ringing uses amber CRT phosphor (~#FFB000), dimmed.
 * - Lumen: graphite base (#0E0F11), off-white text, one desaturated-enough volt accent.
 * - Paper: handwriting fonts Caveat (numerals) + Patrick Hand (text), both OFL.
 * - Ringing/snooze palettes are dim in every pack: no white, no red, low contrast steps.
 *
 * Packs are sellable later: `tier` marks premium packs, isPackUnlocked() gates them.
 * Today every pack is unlocked. No purchases, no paywall (DECISIONS D-06).
 */

export type PackId = 'lumen' | 'paper' | 'field' | 'signal';

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  onAccent: string;
  ok: string;
  warn: string;
  danger: string;
};

/** Dim palette for the ringing and snoozed screens. */
export type RingPalette = {
  bg: string;
  text: string;
  textDim: string;
  accent: string;
  onAccent: string;
  track: string;
  glow: string;
};

export type DesignPack = {
  id: PackId;
  name: string;
  tagline: string;
  tier: 'free' | 'premium';
  mode: 'light' | 'dark';
  colors: Palette;
  ring: RingPalette;
  fonts: {
    body: string;
    medium: string;
    strong: string;
    /** big numerals */
    display: string;
  };
  /** extra letter spacing for small labels */
  labelCaps: boolean;
  radius: { card: number; control: number; chip: number };
  /** 'bevel' = 90s 3-D chrome (Signal); 'sketch' = hand-drawn notebook (Paper); 'soft' = flat modern */
  chrome: 'soft' | 'bevel' | 'sketch';
  /** big clock numeral size on Home */
  heroSize: number;
  /** highlighter colour for primary buttons (sketch only) */
  marker?: string;
};

export const PACKS: Record<PackId, DesignPack> = {
  // 1. Lumen: modern graphite with one volt-lime accent, wide numerals, bento tiles.
  lumen: {
    id: 'lumen',
    name: 'Lumen',
    tagline: 'Graphite, volt, bento',
    tier: 'free',
    mode: 'dark',
    colors: {
      bg: '#0E0F11',
      surface: '#17181B',
      surfaceAlt: '#212226',
      border: '#2B2C31',
      text: '#EDEDEF',
      textDim: '#9A9BA2',
      accent: '#D4F25C',
      onAccent: '#12140A',
      ok: '#B5E48C',
      warn: '#F2C14E',
      danger: '#F2786D',
    },
    ring: {
      bg: '#08090A',
      text: '#B4B6BB',
      textDim: '#74767D',
      accent: '#98AE45',
      onAccent: '#08090A',
      track: '#1C1E21',
      glow: '#98AE45',
    },
    fonts: {
      body: 'Manrope_400Regular',
      medium: 'Manrope_600SemiBold',
      strong: 'Manrope_800ExtraBold',
      display: 'Unbounded_300Light',
    },
    labelCaps: false,
    radius: { card: 28, control: 20, chip: 22 },
    chrome: 'soft',
    heroSize: 76,
  },

  // 2. Paper: a handwritten notebook. Ruled paper, graphite ink, red pen, a yellow highlighter.
  paper: {
    id: 'paper',
    name: 'Paper',
    tagline: 'Handwritten notebook',
    tier: 'free',
    mode: 'light',
    colors: {
      bg: '#F3EEE2',
      surface: '#FFFCF4',
      surfaceAlt: '#ECE5D4',
      border: '#D8CDB8',
      text: '#2A2926',
      textDim: '#6B655A',
      accent: '#B8382A',
      onAccent: '#FFF8F0',
      ok: '#3C7A47',
      warn: '#A5640F',
      danger: '#B23A26',
    },
    // At night the notebook is dark: chalky handwriting, never bright white.
    ring: {
      bg: '#1A1815',
      text: '#C9BFAE',
      textDim: '#7F776A',
      accent: '#C2A86E',
      onAccent: '#1A1815',
      track: '#34302A',
      glow: '#6B5A3A',
    },
    fonts: {
      body: 'PatrickHand_400Regular',
      medium: 'PatrickHand_400Regular',
      strong: 'Caveat_700Bold',
      display: 'Caveat_600SemiBold',
    },
    labelCaps: false,
    radius: { card: 4, control: 14, chip: 4 },
    chrome: 'sketch',
    heroSize: 112,
    marker: '#F6DF6B',
  },

  // 3. Field: early morning outdoors. Moss green and bone, soft rounded shapes.
  field: {
    id: 'field',
    name: 'Field',
    tagline: 'Moss, bone, first light',
    tier: 'free',
    mode: 'dark',
    colors: {
      bg: '#111813',
      surface: '#18221A',
      surfaceAlt: '#213024',
      border: '#2B3B2E',
      text: '#EAE4D3',
      textDim: '#9CA690',
      accent: '#B5C98A',
      onAccent: '#142014',
      ok: '#B5C98A',
      warn: '#E0B867',
      danger: '#D98466',
    },
    ring: {
      bg: '#0C110D',
      text: '#C0BAA6',
      textDim: '#728069',
      accent: '#C9A961',
      onAccent: '#0C110D',
      track: '#1C281E',
      glow: '#B08D4A',
    },
    fonts: {
      body: 'Nunito_400Regular',
      medium: 'Nunito_600SemiBold',
      strong: 'Nunito_800ExtraBold',
      display: 'Nunito_300Light',
    },
    labelCaps: false,
    radius: { card: 32, control: 22, chip: 999 },
    chrome: 'soft',
    heroSize: 84,
  },

  // 4. Signal: 90s desktop. Teal desk, grey 3-D chrome, pixel type; rings as an amber CRT.
  signal: {
    id: 'signal',
    name: 'Signal',
    tagline: '90s desktop, amber CRT',
    tier: 'free',
    mode: 'light',
    colors: {
      bg: '#008080',
      surface: '#C0C0C0',
      surfaceAlt: '#DFDFDF',
      border: '#808080',
      text: '#000000',
      textDim: '#3F3F3F',
      accent: '#0B4F4E',
      onAccent: '#F2F2E6',
      ok: '#1E6B2E',
      warn: '#7A5300',
      danger: '#8E1F12',
    },
    ring: {
      bg: '#0B0904',
      text: '#D49A1C',
      textDim: '#8A6818',
      accent: '#E0A42A',
      onAccent: '#0B0904',
      track: '#2A1F08',
      glow: '#FFB000',
    },
    fonts: {
      // VT323: a free (OFL) terminal font, used for everything in Signal.
      body: 'VT323_400Regular',
      medium: 'VT323_400Regular',
      strong: 'VT323_400Regular',
      display: 'VT323_400Regular',
    },
    labelCaps: true,
    radius: { card: 0, control: 0, chip: 0 },
    chrome: 'bevel',
    heroSize: 96,
  },
};

export const PACK_ORDER: PackId[] = ['lumen', 'paper', 'field', 'signal'];
export const DEFAULT_PACK: PackId = 'lumen';

/** Real Play Billing comes later (D-06). Until then every pack is unlocked. */
export function isPackUnlocked(_id: PackId): boolean {
  return true;
}

/** 90s 3-D chrome edge colours (used only when chrome === 'bevel'). */
export const BEVEL = {
  light: '#FFFFFF',
  light2: '#DFDFDF',
  shadow: '#808080',
  dark: '#000000',
  titleBar: '#0B4F4E',
  titleText: '#F2F2E6',
};
