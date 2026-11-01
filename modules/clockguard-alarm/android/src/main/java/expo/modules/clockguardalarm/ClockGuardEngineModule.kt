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
     * Arm (or re-arm) the schedule. Fails with a coded error instead of reporting
     * success when notifications, exact alarms or full-screen access are missing.
     * Returns the next trigger time in ms.
     */
    Function("arm") { hour: Int, minute: Int, days: List<Int> ->
      val ctx = context
      if (hour !in 0..23 || minute !in 0..59) throw CodedException("ERR_INVALID_TIME", "Invalid time", null)
      val cleanDays = days.filter { it in 0..6 }.distinct()
      if (cleanDays.isEmpty()) throw CodedException("ERR_NO_DAYS", "Pick at least one day", null)
      requireAlarmAccess(ctx)
      AlarmStore.saveSchedule(ctx, hour, minute, cleanDays)
      val at = try {
        AlarmScheduler.scheduleNextRing(ctx)
      } catch (e: Exception) {
        AlarmStore.setArmed(ctx, false)
        AlarmScheduler.cancelNextRing(ctx)
        AlarmStateBus.notifyChanged(ctx)
        throw CodedException("ERR_SCHEDULE_FAILED", "Android refused to schedule the exact alarm", e)
      }
      AlarmStateBus.notifyChanged(ctx)
      at?.toDouble() ?: throw CodedException("ERR_SCHEDULE_FAILED", "No next alarm time found", null)
    }

    /** Turns the schedule off. Never stops a ring/snooze in progress (that needs the mission). */
    Function("cancel") {
      val ctx = context
      AlarmStore.setArmed(ctx, false)
      AlarmScheduler.cancelNextRing(ctx)
      AlarmStateBus.notifyChanged(ctx)
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
      if (AlarmStore.state(ctx) == AlarmStore.STATE_IDLE) return@Function false
      // If rescheduling fails, nextTriggerAt stays 0 and the UI shows "alarm NOT active".
      RingSession.end(ctx)
      true
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
