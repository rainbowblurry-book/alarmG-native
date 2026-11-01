package expo.modules.clockguardalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/** Thrown when Android does not allow exact alarms. Never silently downgraded (DECISIONS D-29). */
class ExactAlarmDeniedException : IllegalStateException("Exact alarms are not allowed for ClockGuard")

/**
 * All AlarmManager work. Independent exact alarms, all via setAlarmClock()
 * (exact, wakes from Doze, shows the status-bar alarm icon):
 *  - RING: the soonest ring among all alarms that are on.
 *  - SNOOZE_END: when the current snooze is over.
 *  - RESUME: restart an interrupted ring shortly after reboot.
 *  - WAKE_CHECK / CHECK_TIMEOUT: the optional wake-up check after the mission.
 *  - TEST: a one-off test ring (testing-only).
 */
object AlarmScheduler {
  const val ACTION_RING = "expo.modules.clockguardalarm.ACTION_RING"
  const val ACTION_SNOOZE_END = "expo.modules.clockguardalarm.ACTION_SNOOZE_END"
  const val ACTION_RESUME = "expo.modules.clockguardalarm.ACTION_RESUME"
  // TESTING-ONLY START
  const val ACTION_TEST_RING = "expo.modules.clockguardalarm.ACTION_TEST_RING"
  private const val REQ_TEST = 9105
  // TESTING-ONLY END

  private const val REQ_RING = 9101
  private const val REQ_SNOOZE_END = 9102
  private const val REQ_RESUME = 9103
  private const val REQ_SHOW = 9104
  private const val REQ_TIMEOUT = 9106
  private const val REQ_WAKE_CHECK = 9107
  private const val REQ_CHECK_TIMEOUT = 9108
  const val ACTION_WAKE_CHECK = "expo.modules.clockguardalarm.ACTION_WAKE_CHECK"
  const val ACTION_CHECK_TIMEOUT = "expo.modules.clockguardalarm.ACTION_CHECK_TIMEOUT"
  const val ACTION_RING_TIMEOUT = "expo.modules.clockguardalarm.ACTION_RING_TIMEOUT"

  /** Ringing stops by itself this long after the alarm first rang (snoozes included). */
  const val MAX_SESSION_MS = 90L * 60L * 1000L
  /** A ring that starts after the limit (e.g. a late snooze ending) still rings this long. */
  const val MIN_FINAL_RING_MS = 5L * 60L * 1000L

  fun canScheduleExact(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
  }

  /** Next time at hour:minute on one of [days] (Sun=0..Sat=6) strictly after [fromMs]. */
  fun nextTrigger(hour: Int, minute: Int, days: List<Int>, fromMs: Long): Long? {
    if (days.isEmpty()) return null
    for (offset in 0..7) {
      val c = Calendar.getInstance()
      c.timeInMillis = fromMs
      c.add(Calendar.DAY_OF_YEAR, offset)
      c.set(Calendar.HOUR_OF_DAY, hour)
      c.set(Calendar.MINUTE, minute)
      c.set(Calendar.SECOND, 0)
      c.set(Calendar.MILLISECOND, 0)
      val dow = c.get(Calendar.DAY_OF_WEEK) - 1 // Sun=0 .. Sat=6, same as JS getDay()
      if (days.contains(dow) && c.timeInMillis > fromMs) return c.timeInMillis
    }
    return null
  }

  private fun broadcast(ctx: Context, action: String, requestCode: Int): PendingIntent {
    val i = Intent(ctx, AlarmReceiver::class.java).setAction(action)
    return PendingIntent.getBroadcast(
      ctx, requestCode, i,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun showIntent(ctx: Context): PendingIntent =
    PendingIntent.getActivity(
      ctx, REQ_SHOW, AlarmLauncher.launchIntent(ctx, fromAlarm = false),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

  /** Exact only. Throws ExactAlarmDeniedException (or SecurityException) instead of downgrading. */
  private fun setExact(ctx: Context, at: Long, op: PendingIntent) {
    if (!canScheduleExact(ctx)) throw ExactAlarmDeniedException()
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.setAlarmClock(AlarmManager.AlarmClockInfo(at, showIntent(ctx)), op)
  }

  private fun cancel(ctx: Context, action: String, requestCode: Int) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(broadcast(ctx, action, requestCode))
  }

  /**
   * (Re)schedules the soonest ring among all alarms that are on, or cancels it when
   * none is on. Only ONE ring alarm is ever registered; after it rings, this runs again
   * and lines up the next soonest one. Alarms set to the same minute ring once.
   * On failure nextTriggerAt is set to 0 so the UI shows "alarm NOT active".
   */
  fun scheduleNextRing(ctx: Context): Long? {
    cancel(ctx, ACTION_RING, REQ_RING)
    AlarmStore.setNextTriggerAt(ctx, 0L)
    AlarmStore.setNextAlarmId(ctx, "")
    val now = System.currentTimeMillis()
    var bestAt: Long? = null
    var bestId = ""
    for (a in AlarmStore.alarms(ctx)) {
      if (!a.enabled) continue
      val at = nextTrigger(a.hour, a.minute, a.days, now) ?: continue
      if (bestAt == null || at < bestAt) {
        bestAt = at
        bestId = a.id
      }
    }
    val at = bestAt ?: return null
    setExact(ctx, at, broadcast(ctx, ACTION_RING, REQ_RING))
    AlarmStore.setNextTriggerAt(ctx, at)
    AlarmStore.setNextAlarmId(ctx, bestId)
    return at
  }

  fun cancelNextRing(ctx: Context) {
    cancel(ctx, ACTION_RING, REQ_RING)
    AlarmStore.setNextTriggerAt(ctx, 0L)
    AlarmStore.setNextAlarmId(ctx, "")
  }

  fun scheduleSnoozeEnd(ctx: Context, at: Long) {
    setExact(ctx, at, broadcast(ctx, ACTION_SNOOZE_END, REQ_SNOOZE_END))
  }

  fun cancelSnoozeEnd(ctx: Context) = cancel(ctx, ACTION_SNOOZE_END, REQ_SNOOZE_END)

  /**
   * Restart an interrupted ring a few seconds from now through an exact alarm.
   * A foreground service may not be started directly from BOOT_COMPLETED on
   * newer Android, but it may from an exact-alarm broadcast.
   */
  fun scheduleResume(ctx: Context, delayMs: Long = 3000L) {
    setExact(ctx, System.currentTimeMillis() + delayMs, broadcast(ctx, ACTION_RESUME, REQ_RESUME))
  }

  /** Called whenever ringing (re)starts. */
  fun scheduleRingTimeout(ctx: Context) {
    val now = System.currentTimeMillis()
    val session = AlarmStore.sessionStartedAt(ctx).takeIf { it > 0L } ?: now
    val at = maxOf(session + MAX_SESSION_MS, now + MIN_FINAL_RING_MS)
    setExact(ctx, at, broadcast(ctx, ACTION_RING_TIMEOUT, REQ_TIMEOUT))
  }

  fun cancelRingTimeout(ctx: Context) = cancel(ctx, ACTION_RING_TIMEOUT, REQ_TIMEOUT)

  /** Wake-up check, N minutes after the mission (WakeCheck). */
  fun scheduleWakeCheck(ctx: Context, at: Long) {
    setExact(ctx, at, broadcast(ctx, ACTION_WAKE_CHECK, REQ_WAKE_CHECK))
  }

  fun cancelWakeCheck(ctx: Context) = cancel(ctx, ACTION_WAKE_CHECK, REQ_WAKE_CHECK)

  /** End of the 60-second "Still up?" window. */
  fun scheduleCheckTimeout(ctx: Context, at: Long) {
    setExact(ctx, at, broadcast(ctx, ACTION_CHECK_TIMEOUT, REQ_CHECK_TIMEOUT))
  }

  fun cancelCheckTimeout(ctx: Context) = cancel(ctx, ACTION_CHECK_TIMEOUT, REQ_CHECK_TIMEOUT)

  // TESTING-ONLY START
  fun scheduleTestRing(ctx: Context, at: Long) {
    setExact(ctx, at, broadcast(ctx, ACTION_TEST_RING, REQ_TEST))
  }

  fun cancelTestRing(ctx: Context) = cancel(ctx, ACTION_TEST_RING, REQ_TEST)
  // TESTING-ONLY END
}
