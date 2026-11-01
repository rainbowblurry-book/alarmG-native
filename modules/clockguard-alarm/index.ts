import { NativeModule, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Native alarm engine "ClockGuardEngine" (Android).
 * Source: android/src/main/java/expo/modules/clockguardalarm/.
 * Native owns scheduling, ringing (sound, vibration, lock screen, optional
 * volume boost), snooze timing and boot recovery. JS renders state and calls
 * these functions after the user completes the mission.
 */

export type RingState = 'idle' | 'ringing' | 'snoozed';

export type AlarmState = {
  state: RingState;
  armed: boolean;
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
