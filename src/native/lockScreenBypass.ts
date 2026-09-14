import { NativeModules, Platform } from 'react-native';

/**
 * Thin JS wrapper around the native LockScreenBypass module.
 * Call setLockScreenBypassEnabled(true) ONLY while the alarm is
 * actively ringing or snoozed (WakeFlowContext.status !== 'idle').
 * Call setLockScreenBypassEnabled(false) the instant it returns to
 * 'idle' (dismissed, exited preview, etc). This keeps the app behaving
 * like a normal app the rest of the time — it goes to the background
 * on lock instead of reappearing over the lock screen.
 */
export function setLockScreenBypassEnabled(enabled: boolean): void {
  if (Platform.OS !== 'android') return;
  const { LockScreenBypass } = NativeModules;
  if (!LockScreenBypass) {
    console.warn(
      'LockScreenBypass native module not found — did you rebuild the dev client after adding withLockScreenBypass.js?'
    );
    return;
  }
  LockScreenBypass.setEnabled(enabled);
}
