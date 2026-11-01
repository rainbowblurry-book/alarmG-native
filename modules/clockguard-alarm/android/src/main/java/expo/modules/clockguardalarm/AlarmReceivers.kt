package expo.modules.clockguardalarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

private const val TAG = "ClockGuard"

/** Fired by AlarmManager: scheduled ring, end of snooze, post-reboot resume, test ring. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    try {
      when (action) {
        AlarmScheduler.ACTION_RING -> {
          if (!AlarmStore.isArmed(context)) return
          if (AlarmStore.state(context) == AlarmStore.STATE_IDLE) {
            AlarmStore.startNewRing(context, isTest = false)
          } else {
            // A ring or snooze is still active (e.g. a test ring): the real alarm takes over.
            AlarmScheduler.cancelSnoozeEnd(context)
            AlarmStore.resumeRing(context, clearTestFlag = true)
          }
          AlarmRingService.start(context)
        }
        AlarmScheduler.ACTION_SNOOZE_END -> {
          if (AlarmStore.state(context) != AlarmStore.STATE_SNOOZED) return
          AlarmStore.resumeRing(context)
          AlarmRingService.start(context)
        }
        AlarmScheduler.ACTION_RING_TIMEOUT -> {
          if (AlarmStore.state(context) == AlarmStore.STATE_RINGING) RingSession.giveUp(context)
        }
        AlarmScheduler.ACTION_RESUME -> {
          if (AlarmStore.state(context) != AlarmStore.STATE_RINGING) return
          AlarmRingService.start(context)
        }
        // TESTING-ONLY START
        AlarmScheduler.ACTION_TEST_RING -> {
          AlarmStore.setTestRingAt(context, 0L)
          // Never interrupt or replace a real ring/snooze with a test ring.
          if (AlarmStore.state(context) != AlarmStore.STATE_IDLE) return
          AlarmStore.startNewRing(context, isTest = true)
          AlarmRingService.start(context)
        }
        // TESTING-ONLY END
      }
    } catch (e: Exception) {
      Log.e(TAG, "AlarmReceiver failed for $action", e)
      // Last resort so the user still hears something.
      runCatching { AlarmNotifications.showFallbackRinging(context) }
    } finally {
      if (action == AlarmScheduler.ACTION_RING) {
        // Always line up the next repeat day, even if ringing failed.
        runCatching { AlarmScheduler.scheduleNextRing(context) }
          .onFailure { Log.e(TAG, "Failed to schedule next ring", it) }
      }
      AlarmStateBus.notifyChanged(context)
    }
  }
}

/**
 * Reboot, app update, clock/timezone change, or the exact-alarm permission
 * being granted: AlarmManager alarms must be registered again.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action
    if (action == AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED &&
      !AlarmScheduler.canScheduleExact(context)
    ) {
      return
    }
    runCatching { AlarmScheduler.scheduleNextRing(context) }
      .onFailure { Log.e(TAG, "Reschedule failed for $action", it) }
    try {
      when (AlarmStore.state(context)) {
        AlarmStore.STATE_RINGING -> AlarmScheduler.scheduleResume(context)
        AlarmStore.STATE_SNOOZED -> {
          val until = AlarmStore.snoozeUntil(context)
          if (until <= System.currentTimeMillis()) {
            AlarmStore.resumeRing(context)
            AlarmScheduler.scheduleResume(context)
          } else {
            AlarmScheduler.scheduleSnoozeEnd(context, until)
          }
        }
      }
      // TESTING-ONLY START
      val testAt = AlarmStore.testRingAt(context)
      if (testAt > System.currentTimeMillis()) AlarmScheduler.scheduleTestRing(context, testAt)
      else if (testAt != 0L) AlarmStore.setTestRingAt(context, 0L)
      // TESTING-ONLY END
    } catch (e: Exception) {
      Log.e(TAG, "BootReceiver failed for $action", e)
    }
    AlarmStateBus.notifyChanged(context)
  }
}
