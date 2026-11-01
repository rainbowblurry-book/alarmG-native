import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../theme/themes';
import { setVolumeBoostEnabled } from '../../modules/clockguard-alarm';

/**
 * User preferences and the mission setup. NOTE: whether the alarm is armed,
 * ringing or snoozed is NOT stored here: the native engine owns that
 * (modules/clockguard-alarm). alarmHour/alarmMinute/repeatDays are the
 * draft shown on the wheels; arming copies them into the native engine.
 */
export type AlarmSettings = {
  alarmHour: number;
  alarmMinute: number;
  repeatDays: number[];
  wakeItemName: string;
  wakeBarcode: string;
  snoozePin: string;
  movementEnabled: boolean;
  movementTarget: number;
  crueltyModeEnabled: boolean;
  /** Optional, default OFF: raise a low ALARM volume to 60% once when ringing starts (D-30). */
  volumeBoostEnabled: boolean;
};

const STORAGE_KEY = '@wakeup_settings';

// Values the old app shipped as defaults. They were never chosen by the user,
// so they must not count as "item registered" / "PIN set" (DECISIONS D-25).
const LEGACY_DEFAULT_BARCODE = '012345678905';
const LEGACY_DEFAULT_PIN = '8492017356';

const DEFAULT_SETTINGS: AlarmSettings = {
  alarmHour: 7,
  alarmMinute: 0,
  repeatDays: [1, 2, 3, 4, 5],
  wakeItemName: '',
  wakeBarcode: '',
  snoozePin: '',
  movementEnabled: true,
  movementTarget: 15,
  crueltyModeEnabled: false,
  volumeBoostEnabled: false,
};

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Keeps every valid known field from stored data; drops unknown or invalid ones. */
function sanitize(data: unknown): AlarmSettings {
  const out: AlarmSettings = { ...DEFAULT_SETTINGS };
  if (!data || typeof data !== 'object') return out;
  const d = data as Record<string, unknown>;

  if (isInt(d.alarmHour, 0, 23)) out.alarmHour = d.alarmHour;
  if (isInt(d.alarmMinute, 0, 59)) out.alarmMinute = d.alarmMinute;
  if (Array.isArray(d.repeatDays) && d.repeatDays.every((x) => isInt(x, 0, 6))) {
    out.repeatDays = [...new Set(d.repeatDays as number[])].sort();
  }
  if (typeof d.wakeItemName === 'string') out.wakeItemName = d.wakeItemName;
  if (typeof d.wakeBarcode === 'string' && d.wakeBarcode !== LEGACY_DEFAULT_BARCODE) {
    out.wakeBarcode = d.wakeBarcode;
  }
  if (typeof d.snoozePin === 'string' && /^\d{10}$/.test(d.snoozePin) && d.snoozePin !== LEGACY_DEFAULT_PIN) {
    out.snoozePin = d.snoozePin;
  }
  if (typeof d.movementEnabled === 'boolean') out.movementEnabled = d.movementEnabled;
  if (isInt(d.movementTarget, 5, 50)) out.movementTarget = d.movementTarget;
  if (typeof d.crueltyModeEnabled === 'boolean') out.crueltyModeEnabled = d.crueltyModeEnabled;
  if (typeof d.volumeBoostEnabled === 'boolean') out.volumeBoostEnabled = d.volumeBoostEnabled;
  return out;
}

type SettingsContextType = {
  settings: AlarmSettings;
  updateSettings: (newSettings: Partial<AlarmSettings>) => void;
  resetSettings: () => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored !== null) setSettings(sanitize(JSON.parse(stored)));
      })
      .catch((error) => console.error('Failed to load settings', error))
      .finally(() => setIsLoading(false));
  }, []);

  // The native engine reads this flag at ring start, so keep it in sync.
  useEffect(() => {
    if (!isLoading) setVolumeBoostEnabled(settings.volumeBoostEnabled);
  }, [isLoading, settings.volumeBoostEnabled]);

  const updateSettings = (newSettings: Partial<AlarmSettings>) => {
    setSettings((previous) => {
      const updated = { ...previous, ...newSettings };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) =>
        console.error('Failed to save settings', error)
      );
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS)).catch((error) =>
      console.error('Failed to reset settings', error)
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: THEME.background }]}>
        <Text style={[styles.loadingText, { color: THEME.text }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

/** True when the user registered their own item and set their own PIN. */
export function isMissionReady(s: AlarmSettings): boolean {
  return s.wakeBarcode.trim().length > 0 && /^\d{10}$/.test(s.snoozePin);
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16 },
});
