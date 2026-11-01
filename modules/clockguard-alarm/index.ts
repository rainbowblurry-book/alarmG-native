import { NativeModule, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Native alarm engine "ClockGuardEngine" (Android).
 * Source: android/src/main/java/expo/modules/clockguardalarm/.
 * Native owns scheduling, ringing (sound, vibration, lock screen, optional
 * volume boost), snooze timing and boot recovery. JS renders state and calls
 * these functions after the user completes the mission.
 */

/** 'check' = the optional wake-up check is on screen ("Still up?"). */
export type RingState = 'idle' | 'ringing' | 'snoozed' | 'check';

/** One alarm of the list (max 5). */
export type AlarmItem = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  enabled: boolean;
  /** epoch ms of this alarm's next ring; 0 when off */
  nextTriggerAt: number;
};

export const MAX_ALARMS = 5;

export type AlarmState = {
  state: RingState;
  /** true when at least one alarm is on */
  armed: boolean;
  alarms: AlarmItem[];
  /** id of the alarm lined up next ('' when none) */
  nextAlarmId: string;
  /** id of the alarm that is ringing/snoozed ('' when idle or a test) */
  ringingAlarmId: string;
  /** session start of the last real ring that hit the 90-minute limit (streaks) */
  lastMissedSession: number;
  /** wake-up check: 0 = off, else minutes after the mission */
  wakeCheckMinutes: number;
  /** epoch ms when a pending check fires (0 = none) */
  checkAt: number;
  /** epoch ms when the on-screen check runs out (state 'check') */
  checkDeadline: number;
  hour: number;
  minute: number;
  days: number[];
  /** epoch ms; 0 when not snoozed */
  snoozeUntil: number;
  snoozeCount: number;
  ringStartedAt: number;
  /** epoch ms of the next scheduled ring; 0 when none (armed + 0 = alarm NOT active) */
  nextTriggerAt: number;
  /** epoch ms when this ring session first started; ringing stops by itself 90 min later */
  sessionStartedAt: number;
  volumeBoostEnabled: boolean;
  // TESTING-ONLY START
  isTestRing: boolean;
  testRingAt: number;
  // TESTING-ONLY END
};

export type AlarmPermissions = {
  notifications: boolean;
  exactAlarms: boolean;
  fullScreen: boolean;
  batteryUnrestricted: boolean;
};

export type SettingsPage = 'notifications' | 'exactAlarms' | 'fullScreen' | 'app';

type Events = {
  onStateChange: (state: AlarmState) => void;
};

declare class ClockGuardEngineNative extends NativeModule<Events> {
  getState(): AlarmState;
  getPermissions(): AlarmPermissions;
  arm(hour: number, minute: number, days: number[]): number;
  cancel(): void;
  saveAlarm(id: string, hour: number, minute: number, days: number[]): void;
  setAlarmEnabled(id: string, enabled: boolean): number;
  deleteAlarm(id: string): boolean;
  confirmAwake(): boolean;
  setWakeCheckMinutes(minutes: number): void;
  snooze(seconds: number): boolean;
  disarm(): boolean;
  setVolumeBoostEnabled(enabled: boolean): void;
  openSettings(which: SettingsPage): void;
  // TESTING-ONLY START
  scheduleTestRing(delaySeconds: number): number;
  cancelTestRing(): void;
  stopTestRing(): boolean;
  // TESTING-ONLY END
}

const Native: ClockGuardEngineNative | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<ClockGuardEngineNative>('ClockGuardEngine') : null;

export function isEngineAvailable(): boolean {
  return Native !== null;
}

const IDLE: AlarmState = {
  state: 'idle',
  armed: false,
  alarms: [],
  nextAlarmId: '',
  ringingAlarmId: '',
  lastMissedSession: 0,
  wakeCheckMinutes: 0,
  checkAt: 0,
  checkDeadline: 0,
  hour: 7,
  minute: 0,
  days: [],
  snoozeUntil: 0,
  snoozeCount: 0,
  ringStartedAt: 0,
  nextTriggerAt: 0,
  sessionStartedAt: 0,
  volumeBoostEnabled: false,
  // TESTING-ONLY START
  isTestRing: false,
  testRingAt: 0,
  // TESTING-ONLY END
};

/** Error codes thrown by arm()/snooze()/scheduleTestRing(), mapped to plain-language reasons. */
export function describeEngineError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  switch (code) {
    case 'ERR_NOTIFICATIONS':
      return 'Notifications are off for ClockGuard. Turn them on, then try again.';
    case 'ERR_EXACT_ALARM':
      return '"Alarms & reminders" is off for ClockGuard. Turn it on, then try again.';
    case 'ERR_FULL_SCREEN':
      return 'Full-screen alarm permission is off for ClockGuard. Turn it on, then try again.';
    case 'ERR_NO_DAYS':
      return 'Pick at least one day.';
    case 'ERR_BUSY':
      return 'An alarm is already ringing or snoozed.';
    case 'ERR_SNOOZE_FAILED':
      return 'Snooze could not be scheduled, so the alarm keeps ringing.';
    case 'ERR_LOCKED':
      return 'Turn this alarm off first.';
    case 'ERR_LIMIT':
      return `You can have up to ${MAX_ALARMS} alarms.`;
    case 'ERR_SCHEDULE_FAILED':
      return 'Android refused to schedule the alarm. Check the phone settings in the Settings tab.';
    default:
      return 'Something went wrong. The alarm was NOT armed.';
  }
}

export function getState(): AlarmState {
  return Native ? Native.getState() : IDLE;
}

export function getPermissions(): AlarmPermissions {
  return Native
    ? Native.getPermissions()
    : { notifications: false, exactAlarms: false, fullScreen: false, batteryUnrestricted: false };
}

/** Throws (with a .code) when arming is not possible; never reports a fake success. */
export function arm(hour: number, minute: number, days: number[]): number {
  if (!Native) throw Object.assign(new Error('Alarm engine missing'), { code: 'ERR_NO_ENGINE' });
  return Native.arm(hour, minute, days);
}

export function cancel(): void {
  Native?.cancel();
}

/** Create or change an alarm (stays off). Throws ERR_LOCKED while it is on, ERR_LIMIT past 5. */
export function saveAlarm(id: string, hour: number, minute: number, days: number[]): void {
  if (!Native) throw Object.assign(new Error('Alarm engine missing'), { code: 'ERR_NO_ENGINE' });
  Native.saveAlarm(id, hour, minute, days);
}

/** Turn one alarm on (same gates as arm) or off. Throws with a .code when it can't be turned on. */
export function setAlarmEnabled(id: string, enabled: boolean): number {
  if (!Native) throw Object.assign(new Error('Alarm engine missing'), { code: 'ERR_NO_ENGINE' });
  return Native.setAlarmEnabled(id, enabled);
}

/** Delete an alarm that is off. */
export function deleteAlarm(id: string): boolean {
  if (!Native) throw Object.assign(new Error('Alarm engine missing'), { code: 'ERR_NO_ENGINE' });
  return Native.deleteAlarm(id);
}

/** "I'm up" on the wake-up check. */
export function confirmAwake(): boolean {
  return Native ? Native.confirmAwake() : false;
}

export function setWakeCheckMinutes(minutes: number): void {
  Native?.setWakeCheckMinutes(minutes);
}

export function snooze(seconds: number): boolean {
  return Native ? Native.snooze(seconds) : false;
}

export function disarm(): boolean {
  return Native ? Native.disarm() : false;
}

export function setVolumeBoostEnabled(enabled: boolean): void {
  Native?.setVolumeBoostEnabled(enabled);
}

export function openSettings(which: SettingsPage): void {
  Native?.openSettings(which);
}

// TESTING-ONLY START
export function scheduleTestRing(delaySeconds: number): number {
  if (!Native) throw Object.assign(new Error('Alarm engine missing'), { code: 'ERR_NO_ENGINE' });
  return Native.scheduleTestRing(delaySeconds);
}

export function cancelTestRing(): void {
  Native?.cancelTestRing();
}

export function stopTestRing(): boolean {
  return Native ? Native.stopTestRing() : false;
}
// TESTING-ONLY END

export function addStateListener(listener: (state: AlarmState) => void): { remove: () => void } {
  if (!Native) return { remove: () => {} };
  return Native.addListener('onStateChange', listener);
}
