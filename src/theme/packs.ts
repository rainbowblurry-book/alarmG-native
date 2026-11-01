/**
 * Design packs: every visual value for the 4 designs lives here (one source of truth).
 * Screens read the active pack through useDesign(); they never hardcode colours.
 *
 * Colour sources (researched 2026-11-01, see docs/UI-PLAN.md "Colour notes"):
 * - Dark surfaces: warm/tinted near-black instead of #000 and off-white text instead of
 *   #FFF (Material dark-theme guidance: pure white "vibrates" on dark, pure black smears on OLED).
 * - Signal (retro): 90s desktop teal #008080 and the classic 3-D chrome greys
 *   #C0C0C0 / #808080 / #DFDFDF; ringing uses amber CRT phosphor (~#FFB000), dimmed.
 * - Ringing/snooze palettes are dim in every pack: no white, no red, low contrast steps.
 *
 * Packs are sellable later: `tier` marks premium packs, isPackUnlocked() gates them.
 * Today every pack is unlocked. No purchases, no paywall (DECISIONS D-06).
 */

export type PackId = 'ember' | 'paper' | 'field' | 'signal';

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
  /** 'bevel' = 90s 3-D chrome (Signal); 'soft' = flat modern surfaces */
  chrome: 'soft' | 'bevel' | 'hairline';
  /** big clock numeral size on Home */
  heroSize: number;
};

export const PACKS: Record<PackId, DesignPack> = {
  // 1. Ember: bedside lamp at night. Warm charcoal, one ember-orange accent.
  ember: {
    id: 'ember',
    name: 'Ember',
    tagline: 'Warm night light',
    tier: 'free',
    mode: 'dark',
    colors: {
      bg: '#14110F',
      surface: '#1D1916',
      surfaceAlt: '#262019',
      border: '#332B24',
      text: '#EEE6DC',
      textDim: '#A2978A',
      accent: '#E8793F',
      onAccent: '#1A0E07',
      ok: '#9DBB7E',
      warn: '#E2AA55',
      danger: '#E0715A',
    },
    ring: {
      bg: '#0D0A08',
      text: '#BFAE9A',
      textDim: '#7E6F61',
      accent: '#C8632F',
      onAccent: '#140A05',
      track: '#2A1F18',
      glow: '#B4501F',
    },
    fonts: {
      body: 'DMSans_400Regular',
      medium: 'DMSans_500Medium',
      strong: 'DMSans_700Bold',
      display: 'Fraunces_300Light',
    },
    labelCaps: false,
    radius: { card: 26, control: 999, chip: 999 },
    chrome: 'soft',
    heroSize: 88,
  },

  // 2. Paper: a printed desk clock. Warm off-white, ink black, one signal red (never on ringing).
  paper: {
    id: 'paper',
    name: 'Paper',
    tagline: 'Printed, quiet, precise',
    tier: 'free',
    mode: 'light',
    colors: {
      bg: '#F1EEE7',
      surface: '#FAF8F3',
      surfaceAlt: '#E6E1D6',
      border: '#D3CCBE',
      text: '#1C1B18',
      textDim: '#6A655B',
      accent: '#B83A25',
      onAccent: '#FFF8F2',
      ok: '#3E7A4E',
      warn: '#A86A12',
      danger: '#B23A26',
    },
    // Paper turns sepia-dark when ringing: never bright white at 6 am.
    ring: {
      bg: '#1B1713',
      text: '#C2B49C',
      textDim: '#857A69',
      accent: '#B08A58',
      onAccent: '#1B1713',
      track: '#2E2820',
      glow: '#8C6B42',
    },
    fonts: {
      body: 'Archivo_400Regular',
      medium: 'Archivo_500Medium',
      strong: 'Archivo_700Bold',
      display: 'Archivo_200ExtraLight',
    },
    labelCaps: true,
    radius: { card: 4, control: 4, chip: 3 },
    chrome: 'hairline',
    heroSize: 104,
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

export const PACK_ORDER: PackId[] = ['ember', 'paper', 'field', 'signal'];
export const DEFAULT_PACK: PackId = 'ember';

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
