import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PACK, DesignPack, isPackUnlocked, PackId, PACKS } from '../theme/packs';

/**
 * UI-only preferences: the active design pack and whether the first-launch
 * readiness checklist was finished. Kept apart from SettingsContext so the
 * alarm settings and their storage format don't change.
 */
const STORAGE_KEY = '@clockguard_ui';

type UiPrefs = { packId: PackId; onboarded: boolean };

type DesignContextType = {
  pack: DesignPack;
  setPack: (id: PackId) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
};

export const DesignContext = createContext<DesignContextType | undefined>(undefined);

export function DesignProvider({ children, initial }: { children: ReactNode; initial?: Partial<UiPrefs> }) {
  const [prefs, setPrefs] = useState<UiPrefs>({ packId: initial?.packId ?? DEFAULT_PACK, onboarded: initial?.onboarded ?? false });
  const [loaded, setLoaded] = useState(Boolean(initial));

  useEffect(() => {
    if (initial) return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const d = JSON.parse(raw) as Partial<UiPrefs>;
        setPrefs({
          packId: d.packId && d.packId in PACKS && isPackUnlocked(d.packId) ? d.packId : DEFAULT_PACK,
          onboarded: d.onboarded === true,
        });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = (next: UiPrefs) => {
    setPrefs(next);
    if (!initial) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  if (!loaded) return null;

  return (
    <DesignContext.Provider
      value={{
        pack: PACKS[prefs.packId],
        setPack: (id) => {
          if (isPackUnlocked(id)) save({ ...prefs, packId: id });
        },
        onboarded: prefs.onboarded,
        setOnboarded: (v) => save({ ...prefs, onboarded: v }),
      }}
    >
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('useDesign must be used within a DesignProvider');
  return ctx;
}
