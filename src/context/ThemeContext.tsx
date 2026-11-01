import { THEME, ThemeConfig } from '../theme/themes';

/** One fixed theme for now (DECISIONS D-23). Kept as a hook so screens don't change when themes return. */
export function useTheme(): { theme: ThemeConfig } {
  return { theme: THEME };
}
