// TESTING-ONLY START (whole file): web-only visual preview. Never used on Android.
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlarmSettings, SettingsContext } from '../context/SettingsContext';
import { WakeFlowContext } from '../context/WakeFlowContext';
import { DesignProvider } from '../context/DesignContext';
import { setPermissionsReaderForPreview } from '../logic/useReadiness';
import { AppShell } from '../../App';
import type { AlarmState } from '../../modules/clockguard-alarm';
import type { PackId } from '../theme/packs';
import type { RootStack } from '../navigation/types';

/**
 * Renders any screen of any design with a mocked engine, for screenshots:
 *   /?design=lumen&screen=Home&state=idle|armed|blocked|ringing|scan|snoozed&test=1&perms=ok|missing
 */
const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const design = (q.get('design') ?? 'lumen') as PackId;
const screen = (q.get('screen') ?? 'Home') as keyof RootStack;
const state = q.get('state') ?? 'idle';
const permsOk = q.get('perms') !== 'missing';
(globalThis as { __cgPreviewSheet?: boolean }).__cgPreviewSheet = q.get('sheet') === '1';

setPermissionsReaderForPreview(() => ({ notifications: permsOk, exactAlarms: permsOk, fullScreen: permsOk, batteryUnrestricted: permsOk }));

const now = Date.now();
const alarm: AlarmState = {
  state: state === 'ringing' || state === 'scan' ? 'ringing' : state === 'snoozed' ? 'snoozed' : 'idle',
  armed: state !== 'idle' && state !== 'blocked',
  hour: 6,
  minute: 45,
  days: [1, 2, 3, 4, 5],
  snoozeUntil: state === 'snoozed' ? now + 4 * 60000 + 12000 : 0,
  snoozeCount: state === 'snoozed' ? 1 : 0,
  ringStartedAt: now,
  nextTriggerAt: state === 'armed' ? now + (7 * 60 + 20) * 60000 : 0,
  sessionStartedAt: now,
  volumeBoostEnabled: false,
  isTestRing: q.get('test') === '1',
  testRingAt: 0,
};

const baseSettings: AlarmSettings = {
  alarmHour: 6,
  alarmMinute: 45,
  repeatDays: [1, 2, 3, 4, 5],
  wakeItemName: 'Toothpaste',
  wakeBarcode: state === 'blocked' ? '' : '7310865004703',
  snoozePin: '4829170356',
  movementEnabled: true,
  movementTarget: 15,
  crueltyModeEnabled: false,
  volumeBoostEnabled: false,
};

export default function PreviewApp() {
  const [settings, setSettings] = useState(baseSettings);
  const [progress, setProgress] = useState(state === 'scan' ? 15 : 7);
  const fail = () => null;
  return (
    <SafeAreaProvider>
      <SettingsContext.Provider
        value={{ settings, updateSettings: (s) => setSettings((p) => ({ ...p, ...s })), resetSettings: () => setSettings(baseSettings) }}
      >
        <WakeFlowContext.Provider
          value={{
            alarm,
            movementProgress: progress,
            incrementMovement: (max) => setProgress((p) => Math.min(max, p + 1)),
            arm: fail,
            cancelAlarm: () => {},
            snooze: fail,
            disarm: () => {},
            refresh: () => {},
            scheduleTestRing: fail,
            cancelTestRing: () => {},
            stopTestRing: () => {},
          }}
        >
          <DesignProvider initial={{ packId: design, onboarded: true }}>
            <AppShell initialRoute={screen} />
          </DesignProvider>
        </WakeFlowContext.Provider>
      </SettingsContext.Provider>
    </SafeAreaProvider>
  );
}
// TESTING-ONLY END
