package expo.modules.clockguardalarm

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API of the native alarm engine ("ClockGuardEngine").
 * JS renders state and runs the mission (movement, barcode, PIN) before calling
 * snooze()/disarm(). Scheduling, ringing, snooze timing, lock-screen display and
 * boot recovery all live natively.
 */
class ClockGuardEngineModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val stateListener: (Context) -> Unit = { ctx ->
    sendEvent("onStateChange", AlarmStore.snapshot(ctx))
  }

  override fun definition() = ModuleDefinition {
    Name("ClockGuardEngine")

    Events("onStateChange")

    OnCreate {
      AlarmStateBus.add(stateListener)
      appContext.reactContext?.let { AlarmNotifications.ensureChannels(it) }
    }

    OnDestroy {
      AlarmStateBus.remove(stateListener)
    }

    Function("getState") {
      AlarmStore.snapshot(context)
    }

    Function("getPermissions") {
      permissions(context)
    }

    /**
     * Legacy single-alarm API (kept so nothing breaks): saves the time/days into the
     * first alarm and turns it on. Same gates as setAlarmEnabled().
     */
    Function("arm") { hour: Int, minute: Int, days: List<Int> ->
      val ctx = context
      val id = AlarmStore.alarms(ctx).firstOrNull()?.id ?: "a1"
      upsertAlarm(ctx, id, hour, minute, days, allowWhileOn = true)
      enableAlarm(ctx, id)
    }

    /** Legacy: turns ALL alarms off. Never stops a ring/snooze in progress (that needs the mission). */
    Function("cancel") {
      val ctx = context
      AlarmStore.saveAlarms(ctx, AlarmStore.alarms(ctx).map { it.copy(enabled = false) })
      AlarmScheduler.cancelNextRing(ctx)
      AlarmStateBus.notifyChanged(ctx)
    }

    /**
     * Create or change an alarm (max 5). An alarm that is ON is locked: turn it off
     * first (D-09). A new alarm starts OFF.
     */
    Function("saveAlarm") { id: String, hour: Int, minute: Int, days: List<Int> ->
      val ctx = context
      upsertAlarm(ctx, id, hour, minute, days, allowWhileOn = false)
      AlarmStateBus.notifyChanged(ctx)
    }

    /**
     * Turn one alarm on or off. Turning on checks notifications, exact alarms and
     * full-screen access (D-29) and needs at least one day; it never reports a fake
     * success. Turning off never stops a ring/snooze in progress. Returns the time of
     * the next ring of any alarm (0 when none).
     */
    Function("setAlarmEnabled") { id: String, enabled: Boolean ->
      val ctx = context
      if (enabled) {
        enableAlarm(ctx, id)
      } else {
        AlarmStore.saveAlarms(ctx, AlarmStore.alarms(ctx).map { if (it.id == id) it.copy(enabled = false) else it })
        runCatching { AlarmScheduler.scheduleNextRing(ctx) }
        AlarmStateBus.notifyChanged(ctx)
        AlarmStore.nextTriggerAt(ctx).toDouble()
      }
    }

    /** Delete an alarm that is OFF. */
    Function("deleteAlarm") { id: String ->
      val ctx = context
      val list = AlarmStore.alarms(ctx)
      val target = list.firstOrNull { it.id == id } ?: return@Function false
      if (target.enabled) throw CodedException("ERR_LOCKED", "Turn the alarm off first", null)
      AlarmStore.saveAlarms(ctx, list.filter { it.id != id })
      AlarmStateBus.notifyChanged(ctx)
      true
    }

    /** Only while ringing; JS checks the PIN first. Stays ringing if the snooze can't be scheduled. */
    Function("snooze") { seconds: Int ->
      val ctx = context
      if (AlarmStore.state(ctx) != AlarmStore.STATE_RINGING) return@Function false
      val until = System.currentTimeMillis() + seconds.coerceIn(10, 3600) * 1000L
      try {
        AlarmScheduler.scheduleSnoozeEnd(ctx, until)
      } catch (e: Exception) {
        throw CodedException("ERR_SNOOZE_FAILED", "Could not schedule the snooze; the alarm keeps ringing", e)
      }
      AlarmScheduler.cancelRingTimeout(ctx)
      AlarmStore.startSnooze(ctx, until)
      AlarmRingService.stop(ctx)
      VolumeBoost.restore(ctx)
      AlarmNotifications.showSnoozed(ctx, until)
      AlarmStateBus.notifyChanged(ctx)
      true
    }

    /** Mission complete (movement + matching barcode). The schedule stays armed for the next day. */
    Function("disarm") {
      val ctx = context
      val st = AlarmStore.state(ctx)
      if (st == AlarmStore.STATE_IDLE || st == AlarmStore.STATE_CHECK) return@Function false
      val wasCheckRing = AlarmStore.isCheckRing(ctx)
      val isTest = AlarmStore.isTestRing(ctx)
      // If rescheduling fails, nextTriggerAt stays 0 and the UI shows "alarm NOT active".
      RingSession.end(ctx)
      // Optional wake-up check N minutes later (never after a ring that came from a missed check).
      WakeCheck.afterMission(ctx, wasCheckRing, isTest)
      AlarmStateBus.notifyChanged(ctx)
      true
    }

    /** "I'm up" on the wake-up check screen. */
    Function("confirmAwake") {
      WakeCheck.confirm(context)
    }

    /** Wake-up check: 0 = off (default), otherwise minutes after the mission. */
    Function("setWakeCheckMinutes") { minutes: Int ->
      AlarmStore.setWakeCheckMinutes(context, minutes)
      AlarmStateBus.notifyChanged(context)
    }

    /** Optional, default OFF: raise a low alarm volume to 60% once at ring start. */
    Function("setVolumeBoostEnabled") { enabled: Boolean ->
      AlarmStore.setVolumeBoostEnabled(context, enabled)
    }

    // TESTING-ONLY START
    /** Rings through the real engine after [delaySeconds]. Never touches the saved schedule. */
    Function("scheduleTestRing") { delaySeconds: Int ->
      val ctx = context
      if (AlarmStore.state(ctx) != AlarmStore.STATE_IDLE) {
        throw CodedException("ERR_BUSY", "An alarm is already ringing or snoozed", null)
      }
      requireAlarmAccess(ctx)
      val at = System.currentTimeMillis() + delaySeconds.coerceIn(5, 300) * 1000L
      try {
        AlarmScheduler.scheduleTestRing(ctx, at)
      } catch (e: Exception) {
        throw CodedException("ERR_SCHEDULE_FAILED", "Android refused to schedule the test alarm", e)
      }
      AlarmStore.setTestRingAt(ctx, at)
      AlarmStateBus.notifyChanged(ctx)
      at.toDouble()
    }

    Function("cancelTestRing") {
      val ctx = context
      AlarmScheduler.cancelTestRing(ctx)
      AlarmStore.setTestRingAt(ctx, 0L)
      AlarmStateBus.notifyChanged(ctx)
    }

    /** "Exit test": stops a TEST ring/snooze only. Real alarms can't be stopped this way. */
    Function("stopTestRing") {
      val ctx = context
      if (AlarmStore.state(ctx) == AlarmStore.STATE_IDLE || !AlarmStore.isTestRing(ctx)) return@Function false
      RingSession.end(ctx)
      true
    }
    // TESTING-ONLY END

    Function("openSettings") { which: String ->
      openSettingsPage(context, which)
    }
  }

  private fun upsertAlarm(ctx: Context, id: String, hour: Int, minute: Int, days: List<Int>, allowWhileOn: Boolean) {
    if (id.isBlank() || id.length > 40) throw CodedException("ERR_INVALID_ID", "Invalid alarm id", null)
    if (hour !in 0..23 || minute !in 0..59) throw CodedException("ERR_INVALID_TIME", "Invalid time", null)
    val cleanDays = days.filter { it in 0..6 }.distinct().sorted()
    val list = AlarmStore.alarms(ctx)
    val existing = list.firstOrNull { it.id == id }
    if (existing == null) {
      if (list.size >= AlarmStore.MAX_ALARMS) throw CodedException("ERR_LIMIT", "You can have up to ${AlarmStore.MAX_ALARMS} alarms", null)
      AlarmStore.saveAlarms(ctx, list + AlarmItem(id, hour, minute, cleanDays, false))
    } else {
      if (existing.enabled && !allowWhileOn) throw CodedException("ERR_LOCKED", "Turn the alarm off first", null)
      AlarmStore.saveAlarms(ctx, list.map { if (it.id == id) it.copy(hour = hour, minute = minute, days = cleanDays) else it })
    }
  }

  /** Turns one alarm on through the same gates as before; on any failure it stays off. */
  private fun enableAlarm(ctx: Context, id: String): Double {
    val list = AlarmStore.alarms(ctx)
    val target = list.firstOrNull { it.id == id } ?: throw CodedException("ERR_INVALID_ID", "Unknown alarm", null)
    if (target.days.isEmpty()) throw CodedException("ERR_NO_DAYS", "Pick at least one day", null)
    requireAlarmAccess(ctx)
    AlarmStore.saveAlarms(ctx, list.map { if (it.id == id) it.copy(enabled = true) else it })
    try {
      AlarmScheduler.scheduleNextRing(ctx) ?: throw IllegalStateException("No next alarm time found")
    } catch (e: Exception) {
      AlarmStore.saveAlarms(ctx, AlarmStore.alarms(ctx).map { if (it.id == id) it.copy(enabled = false) else it })
      runCatching { AlarmScheduler.scheduleNextRing(ctx) }
      AlarmStateBus.notifyChanged(ctx)
      throw CodedException("ERR_SCHEDULE_FAILED", "Android refused to schedule the exact alarm", e)
    }
    AlarmStateBus.notifyChanged(ctx)
    return AlarmStore.nextTriggerAt(ctx).toDouble()
  }

  private fun permissions(ctx: Context): Map<String, Boolean> {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    val notificationsGranted =
      (Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED) &&
        NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    return mapOf(
      "notifications" to notificationsGranted,
      "exactAlarms" to AlarmScheduler.canScheduleExact(ctx),
      "fullScreen" to (Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent()),
      "batteryUnrestricted" to pm.isIgnoringBatteryOptimizations(ctx.packageName)
    )
  }

  private fun requireAlarmAccess(ctx: Context) {
    val p = permissions(ctx)
    if (p["notifications"] != true) {
      throw CodedException("ERR_NOTIFICATIONS", "Notifications are off for ClockGuard", null)
    }
    if (p["exactAlarms"] != true) {
      throw CodedException("ERR_EXACT_ALARM", "'Alarms & reminders' permission is off", null)
    }
    if (p["fullScreen"] != true) {
      throw CodedException("ERR_FULL_SCREEN", "Full-screen alarm permission is off", null)
    }
  }

  private fun openSettingsPage(ctx: Context, which: String) {
    val pkgUri = Uri.parse("package:" + ctx.packageName)
    val intent = when (which) {
      "notifications" ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
        } else {
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri)
        }
      "exactAlarms" ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkgUri)
        } else {
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri)
        }
      "fullScreen" ->
        if (Build.VERSION.SDK_INT >= 34) {
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pkgUri)
        } else {
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri)
        }
      else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri)
    }.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      ctx.startActivity(intent)
    } catch (e: Exception) {
      ctx.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkgUri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }
}
