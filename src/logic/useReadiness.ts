import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Alarm from '../../modules/clockguard-alarm';
import type { AlarmPermissions, SettingsPage } from '../../modules/clockguard-alarm';
import { AlarmSettings, isMissionReady } from '../context/SettingsContext';

let readPermissions = Alarm.getPermissions;
// TESTING-ONLY START: lets the web preview show permissions without the engine
export function setPermissionsReaderForPreview(fn: () => AlarmPermissions) {
  readPermissions = fn;
}
// TESTING-ONLY END

/** Phone permissions, re-read whenever the app returns to the foreground. */
export function usePermissions(): [AlarmPermissions, () => void] {
  const [perms, setPerms] = useState<AlarmPermissions>(() => readPermissions());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setPerms(readPermissions());
    });
    return () => sub.remove();
  }, []);
  return [perms, () => setPerms(readPermissions())];
}

export const PERMISSION_ROWS: { key: keyof AlarmPermissions; label: string; hint: string; page: SettingsPage; required: boolean }[] = [
  { key: 'notifications', label: 'Notifications', hint: 'Needed for the ringing screen to appear.', page: 'notifications', required: true },
  { key: 'exactAlarms', label: 'Alarms & reminders', hint: 'Rings at the exact minute.', page: 'exactAlarms', required: true },
  { key: 'fullScreen', label: 'Full-screen alarm', hint: 'Opens over the lock screen by itself.', page: 'fullScreen', required: true },
  { key: 'batteryUnrestricted', label: 'Battery: Unrestricted', hint: 'Advised. App info → Battery → Unrestricted.', page: 'app', required: false },
];

/** Same arming gates as before the redesign (D-25, D-29). */
/** Same gates as before; `days` = the days of the alarm being turned on. */
export function armBlockers(settings: AlarmSettings, perms: AlarmPermissions, days: number[] = settings.repeatDays) {
  const requiredAccessMissing = !perms.notifications || !perms.exactAlarms || !perms.fullScreen;
  const noDays = days.length === 0;
  const itemOk = settings.wakeBarcode.trim().length > 0;
  const pinOk = /^\d{10}$/.test(settings.snoozePin);
  const reasons: { text: string; target: 'item' | 'pin' | 'days' | 'phone' }[] = [];
  if (!itemOk) reasons.push({ text: 'Register your wake-up item', target: 'item' });
  if (!pinOk) reasons.push({ text: 'Set your 10-digit snooze PIN', target: 'pin' });
  if (noDays) reasons.push({ text: 'Pick at least one day', target: 'days' });
  if (requiredAccessMissing) reasons.push({ text: 'Turn on the phone settings', target: 'phone' });
  return {
    itemOk,
    pinOk,
    noDays,
    requiredAccessMissing,
    blocked: noDays || !isMissionReady(settings) || requiredAccessMissing,
    reasons,
  };
}

export const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function describeDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  if (days.length === 0) return 'No days';
  const s = [...days].sort().join(',');
  if (s === '1,2,3,4,5') return 'Weekdays';
  if (s === '0,6') return 'Weekends';
  return [...days].sort().map((d) => DAY_NAMES[d].slice(0, 3)).join(' ');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatIn(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}
