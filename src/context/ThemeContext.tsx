import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, THEME_LIST, DEFAULT_THEME_ID, ThemeId, ThemeConfig } from '../theme/themes';

const THEME_STORAGE_KEY = 'clockguard_theme_v1';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeConfig;
  themeList: ThemeConfig[];
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored && stored in THEMES) {
        setThemeIdState(stored as ThemeId);
      }
    });
  }, []);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  };

  const value: ThemeContextValue = {
    themeId,
    theme: THEMES[themeId],
    themeList: THEME_LIST,
    setThemeId,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
