import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

export type AlarmSettings = {
  alarmHour: number;
  alarmMinute: number;
  repeatDays: number[];
  isArmed: boolean;
  wakeItemName: string;
  wakeBarcode: string;
  snoozePin: string;
  movementEnabled: boolean;
  movementTarget: number;
};

const DEFAULT_SETTINGS: AlarmSettings = {
  alarmHour: 7,
  alarmMinute: 0,
  repeatDays: [1, 2, 3, 4, 5],
  isArmed: false,
  wakeItemName: 'Bathroom Toothpaste',
  wakeBarcode: '012345678905',
  snoozePin: '8492017356',
  movementEnabled: true,
  movementTarget: 15,
};

function isValidSettings(data: any): data is Partial<AlarmSettings> {
  if (!data || typeof data !== 'object') return false;

  if ('alarmHour' in data) {
    if (typeof data.alarmHour !== 'number' || !Number.isInteger(data.alarmHour) || data.alarmHour < 0 || data.alarmHour > 23) return false;
  }
  if ('alarmMinute' in data) {
    if (typeof data.alarmMinute !== 'number' || !Number.isInteger(data.alarmMinute) || data.alarmMinute < 0 || data.alarmMinute > 59) return false;
  }
  if ('repeatDays' in data) {
    if (!Array.isArray(data.repeatDays)) return false;
    for (const day of data.repeatDays) {
      if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) return false;
    }
  }
  if ('isArmed' in data && typeof data.isArmed !== 'boolean') return false;
  if ('wakeItemName' in data && typeof data.wakeItemName !== 'string') return false;
  if ('wakeBarcode' in data && typeof data.wakeBarcode !== 'string') return false;
  if ('snoozePin' in data) {
    if (typeof data.snoozePin !== 'string' || !/^\d{10}$/.test(data.snoozePin)) return false;
  }
  if ('movementEnabled' in data && typeof data.movementEnabled !== 'boolean') return false;
  if ('movementTarget' in data) {
    if (typeof data.movementTarget !== 'number' || !Number.isFinite(data.movementTarget) || !Number.isInteger(data.movementTarget) || data.movementTarget <= 0) return false;
  }

  return true;
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem('@wakeup_settings');
      if (storedSettings !== null) {
        const parsed = JSON.parse(storedSettings);
        if (isValidSettings(parsed)) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            // Native alarm scheduling will own armed state in a later stage.
            isArmed: false,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    } catch (error) {
      console.error('Failed to load settings', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<AlarmSettings>) => {
    setSettings((previousSettings) => {
      const updatedSettings = {
        ...previousSettings,
        ...newSettings,
      };

      AsyncStorage.setItem('@wakeup_settings', JSON.stringify(updatedSettings))
        .catch((error) => console.error('Failed to save settings', error));

      return updatedSettings;
    });
  };

  const resetSettings = async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.setItem('@wakeup_settings', JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('Failed to reset settings', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});