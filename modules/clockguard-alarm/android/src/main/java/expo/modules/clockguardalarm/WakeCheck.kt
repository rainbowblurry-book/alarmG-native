package expo.modules.clockguardalarm

import android.content.Context
import android.util.Log

/**
 * Optional wake-up check (default OFF, DECISIONS D-50).
 *
 * After the mission, if the check is on, an exact alarm fires N minutes later. The
 * phone vibrates and shows "Still up?" with an I'm-up button for [WINDOW_MS].
 *  - Tap in time  -> idle, done.
 *  - No tap       -> a NEW ring starts (full mission needed, its own 90-minute limit)
 *                    and that ring never gets another check, so it can never loop.
 * A scheduled alarm that rings in the meantime replaces any pending/active check.
 */
object WakeCheck {
  private const val TAG = "ClockGuard"
  const val WINDOW_MS = 60_000L

  /** Called right after a mission-completed disarm. */
  fun afterMission(ctx: Context, wasCheckRing: Boolean, isTest: Boolean) {
    val minutes = AlarmStore.wakeCheckMinutes(ctx)
    if (minutes <= 0 || wasCheckRing) return
    val at = System.currentTimeMillis() + minutes * 60_000L
    try {
      AlarmScheduler.scheduleWakeCheck(ctx, at)
      AlarmStore.setCheckPending(ctx, at, isTest)
    } catch (e: Exception) {
      // Without an exact alarm the check can't be enforced; skip it rather than fake it.
      Log.e(TAG, "Wake-up check not scheduled", e)
      AlarmStore.clearCheck(ctx)
    }
  }

  /** WAKE_CHECK alarm fired. */
  fun fire(ctx: Context) {
    val isTest = AlarmStore.checkIsTest(ctx)
    AlarmStore.setCheckPending(ctx, 0L, isTest)
    if (AlarmStore.state(ctx) != AlarmStore.STATE_IDLE) return
    val deadline = System.currentTimeMillis() + WINDOW_MS
    try {
      AlarmScheduler.scheduleCheckTimeout(ctx, deadline)
    } catch (e: Exception) {
      Log.e(TAG, "Wake-up check timeout not scheduled; skipping the check", e)
      AlarmStore.clearCheck(ctx)
      return
    }
    AlarmStore.startCheck(ctx, deadline, isTest)
    AlarmNotifications.showWakeCheck(ctx)
    AlarmStateBus.notifyChanged(ctx)
  }

  /** "I'm up" tapped in time. */
  fun confirm(ctx: Context): Boolean {
    if (AlarmStore.state(ctx) != AlarmStore.STATE_CHECK) return false
    AlarmScheduler.cancelCheckTimeout(ctx)
    AlarmNotifications.cancelWakeCheck(ctx)
    AlarmStore.setIdle(ctx)
    AlarmStore.clearCheck(ctx)
    AlarmStateBus.notifyChanged(ctx)
    return true
  }

  /** No tap in time: ring again with the full mission. */
  fun timeout(ctx: Context) {
    if (AlarmStore.state(ctx) != AlarmStore.STATE_CHECK) return
    val isTest = AlarmStore.checkIsTest(ctx)
    AlarmNotifications.cancelWakeCheck(ctx)
    AlarmStore.clearCheck(ctx)
    AlarmStore.startNewRing(ctx, isTest)
    AlarmStore.setCheckRing(ctx, true)
    AlarmRingService.start(ctx)
    AlarmStateBus.notifyChanged(ctx)
  }

  /** Drops any pending or active check (a new ring took over, or the session ended). */
  fun clearAll(ctx: Context) {
    AlarmScheduler.cancelWakeCheck(ctx)
    AlarmScheduler.cancelCheckTimeout(ctx)
    AlarmNotifications.cancelWakeCheck(ctx)
    AlarmStore.clearCheck(ctx)
  }
}
