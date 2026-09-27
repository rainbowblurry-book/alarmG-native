import { NativeModules, Platform } from 'react-native';

/**
 * JS wrapper for the native ClockGuardAlarm module (plugins/withAlarmClock.js).
 * Android only. On iOS / Expo Go / an old dev client without the module,
 * every function is a safe no-op and isNativeAlarmAvailable() returns false,
 * so alarmScheduler.ts falls back to expo-notifications.
 */
const NativeAlarm = Platform.OS === 'android' ? NativeModules.ClockGuardAlarm : undefined;

export function isNativeAlarmAvailable(): boolean {
  return !!NativeAlarm;
}

export async function scheduleNativeAlarm(
  hour: number,
  minute: number,
  repeatDays: number[],
  title: string,
  body: string
): Promise<number | null> {
  if (!NativeAlarm) return null;
  try {
    const at = await NativeAlarm.schedule(hour, minute, repeatDays, title, body);
    return typeof at === 'number' ? at : null;
  } catch (error) {
    console.warn('ClockGuardAlarm.schedule failed', error);
    return null;
  }
}

export async function cancelNativeAlarm(): Promise<void> {
  if (!NativeAlarm) return;
  try {
    await NativeAlarm.cancel();
  } catch (error) {
    console.warn('ClockGuardAlarm.cancel failed', error);
  }
}

/** True once if the native alarm fired in the last 15 min and nobody handled it yet. */
export async function consumePendingRing(): Promise<boolean> {
  if (!NativeAlarm) return false;
  try {
    return Boolean(await NativeAlarm.consumePendingRing());
  } catch {
    return false;
  }
}

export function clearNativeAlarmNotification(): void {
  if (!NativeAlarm) return;
  NativeAlarm.clearAlarmNotification();
}

/** Android 14+ special permission. Returns true when not applicable. */
export async function canUseFullScreenIntent(): Promise<boolean> {
  if (!NativeAlarm) return true;
  try {
    return Boolean(await NativeAlarm.canUseFullScreenIntent());
  } catch {
    return true;
  }
}

export function openFullScreenIntentSettings(): void {
  if (!NativeAlarm) return;
  NativeAlarm.openFullScreenIntentSettings();
}
