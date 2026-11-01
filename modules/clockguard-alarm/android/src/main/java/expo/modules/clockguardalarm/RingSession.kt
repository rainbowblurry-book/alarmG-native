package expo.modules.clockguardalarm

import android.content.Context
import android.util.Log

/** One place that ends a ring session, so every path cleans up the same way. */
object RingSession {
  private const val TAG = "ClockGuard"

  /**
   * Ring/snooze → idle: stops sound, cancels pending snooze/timeout alarms,
   * restores the volume, and lines up the next repeat day (stays armed).
   */
  fun end(ctx: Context) {
    AlarmScheduler.cancelSnoozeEnd(ctx)
    AlarmScheduler.cancelRingTimeout(ctx)
    WakeCheck.clearAll(ctx)
    AlarmStore.setIdle(ctx)
    AlarmRingService.stop(ctx)
    VolumeBoost.restore(ctx)
    AlarmNotifications.cancelSnoozed(ctx)
    runCatching { AlarmScheduler.scheduleNextRing(ctx) }
      .onFailure { Log.e(TAG, "Reschedule after ring end failed", it) }
    AlarmStateBus.notifyChanged(ctx)
  }

  /** 90-minute limit reached without the mission: stop and leave a "Missed alarm" notice. */
  fun giveUp(ctx: Context) {
    val startedAt = AlarmStore.sessionStartedAt(ctx)
    // Remembered for streaks (a real alarm that was never completed). Test rings don't count.
    if (!AlarmStore.isTestRing(ctx) && startedAt > 0L) AlarmStore.setLastMissedSession(ctx, startedAt)
    end(ctx)
    AlarmNotifications.showMissed(ctx, startedAt)
  }
}
