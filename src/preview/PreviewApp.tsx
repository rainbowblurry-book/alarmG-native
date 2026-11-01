// TESTING-ONLY START (whole file): web-only visual preview. Never used on Android.
import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlarmSettings, SettingsContext } from '../context/SettingsContext';
import { WakeFlowContext } from '../context/WakeFlowContext';
import { DesignProvider } from '../context/DesignContext';
import { setPermissionsReaderForPreview } from '../logic/useReadiness';
import { dayKey, seedMorningsForPreview } from '../logic/mornings';
import { AppShell } from '../../App';
import type { AlarmItem, AlarmState } from '../../modules/clockguard-alarm';
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
if (q.get('history') !== '0') {
  // 4 weeks of sample mornings: mostly done, a couple missed, weekends without alarm
  const seed = [];
  for (let i = 27; i >= 1; i--) {
    const t = now - i * 86400000;
    const dow = new Date(t).getDay();
    if (dow === 0 || dow === 6) continue;
    const session = new Date(new Date(t).setHours(6, 45, 0, 0)).getTime();
    const missed = i === 16 || i === 9;
    seed.push({ session, day: dayKey(session), upAt: missed ? 0 : session + (3 + (i % 5)) * 60000, snoozes: i % 4 === 0 ? 1 : 0, result: missed ? ('missed' as const) : ('done' as const) });
  }
  seedMorningsForPreview(seed);
}
const armedFirst = state !== 'idle' && state !== 'blocked';
// ?alarms=2 shows a second alarm (08:30 weekends, off)
const initialAlarms: AlarmItem[] = [
  { id: 'a1', hour: 6, minute: 45, days: [1, 2, 3, 4, 5], enabled: armedFirst, nextTriggerAt: armedFirst ? now + (7 * 60 + 20) * 60000 : 0 },
  ...(q.get('alarms') === '2' ? [{ id: 'a2', hour: 8, minute: 30, days: [0, 6], enabled: false, nextTriggerAt: 0 }] : []),
];
const baseAlarm: AlarmState = {
  state: state === 'ringing' || state === 'scan' ? 'ringing' : state === 'snoozed' ? 'snoozed' : state === 'check' ? 'check' : 'idle',
  armed: armedFirst,
  alarms: initialAlarms,
  nextAlarmId: armedFirst ? 'a1' : '',
  ringingAlarmId: '',
  lastMissedSession: 0,
  wakeCheckMinutes: 0,
  checkAt: 0,
  checkDeadline: state === 'check' ? now + 42000 : 0,
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
  movementTarget: Number(q.get('moves') ?? 15),
  crueltyModeEnabled: false,
  snoozeMinutes: 5,
  wakeCheckMinutes: Number(q.get('check') ?? 0),
  volumeBoostEnabled: false,
};

export default function PreviewApp() {
  const [settings, setSettings] = useState(baseSettings);
  const [progress, setProgress] = useState(state === 'scan' ? Number(q.get('moves') ?? 15) : Math.round(Number(q.get('moves') ?? 15) * 0.47));
  const fail = () => null;
  const [alarm, setAlarm] = useState(baseAlarm);
  const setList = (fn: (l: AlarmItem[]) => AlarmItem[]) =>
    setAlarm((a) => {
      const alarms = fn(a.alarms);
      return { ...a, alarms, armed: alarms.some((x) => x.enabled) };
    });
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
            saveAlarm: (id, hour, minute, days) => {
              setList((l) => (l.some((x) => x.id === id) ? l.map((x) => (x.id === id ? { ...x, hour, minute, days } : x)) : [...l, { id, hour, minute, days, enabled: false, nextTriggerAt: 0 }]));
              return null;
            },
            setAlarmEnabled: (id, enabled) => {
              setList((l) => l.map((x) => (x.id === id ? { ...x, enabled, nextTriggerAt: enabled ? now + 9 * 3600000 : 0 } : x)));
              return null;
            },
            confirmAwake: () => setAlarm((a) => ({ ...a, state: 'idle' })),
            deleteAlarm: (id) => {
              setList((l) => l.filter((x) => x.id !== id));
              return null;
            },
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
