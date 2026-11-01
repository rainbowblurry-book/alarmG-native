package expo.modules.clockguardalarm

import android.content.Context
import android.content.SharedPreferences

/**
 * Single source of truth for the alarm, persisted natively so it survives
 * process death, removal from Recents and reboots. (Android "Force stop" is
 * different: it clears all alarms until the app is opened again.)
 *
 * Uses device-protected storage so a ring can still start after a reboot
 * before the phone has been unlocked for the first time (Direct Boot).
 */
object AlarmStore {
  const val STATE_IDLE = "idle"
  const val STATE_RINGING = "ringing"
  const val STATE_SNOOZED = "snoozed"

  private const val PREFS = "clockguard_engine_v1"

  private const val K_ARMED = "armed"
  private const val K_HOUR = "hour"
  private const val K_MINUTE = "minute"
  private const val K_DAYS = "days"
  private const val K_STATE = "state"
  private const val K_SNOOZE_UNTIL = "snoozeUntil"
  private const val K_SNOOZE_COUNT = "snoozeCount"
  private const val K_RING_STARTED_AT = "ringStartedAt"
  private const val K_NEXT_TRIGGER_AT = "nextTriggerAt"
  private const val K_SESSION_STARTED_AT = "sessionStartedAt"
  private const val K_VOLUME_BOOST = "volumeBoostEnabled"
  private const val K_VOL_RESTORE_TO = "volumeRestoreTo"
  private const val K_VOL_SET_TO = "volumeSetTo"
  // TESTING-ONLY START
  private const val K_IS_TEST = "isTestRing"
  private const val K_TEST_AT = "testRingAt"
  // TESTING-ONLY END

  private fun prefs(ctx: Context): SharedPreferences {
    val storageCtx = ctx.applicationContext.createDeviceProtectedStorageContext()
    return storageCtx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  // ---- schedule ----

  fun isArmed(ctx: Context) = prefs(ctx).getBoolean(K_ARMED, false)
  fun hour(ctx: Context) = prefs(ctx).getInt(K_HOUR, 7)
  fun minute(ctx: Context) = prefs(ctx).getInt(K_MINUTE, 0)

  fun days(ctx: Context): List<Int> =
    (prefs(ctx).getString(K_DAYS, "") ?: "")
      .split(",")
      .mapNotNull { it.trim().toIntOrNull() }
      .filter { it in 0..6 }

  fun saveSchedule(ctx: Context, hour: Int, minute: Int, days: List<Int>) {
    prefs(ctx).edit()
      .putBoolean(K_ARMED, true)
      .putInt(K_HOUR, hour)
      .putInt(K_MINUTE, minute)
      .putString(K_DAYS, days.distinct().sorted().joinToString(","))
      .commit()
  }

  fun setArmed(ctx: Context, armed: Boolean) {
    prefs(ctx).edit().putBoolean(K_ARMED, armed).commit()
  }

  fun nextTriggerAt(ctx: Context) = prefs(ctx).getLong(K_NEXT_TRIGGER_AT, 0L)

  fun setNextTriggerAt(ctx: Context, at: Long) {
    prefs(ctx).edit().putLong(K_NEXT_TRIGGER_AT, at).commit()
  }

  // ---- ring state ----

  fun state(ctx: Context): String = prefs(ctx).getString(K_STATE, STATE_IDLE) ?: STATE_IDLE
  fun snoozeUntil(ctx: Context) = prefs(ctx).getLong(K_SNOOZE_UNTIL, 0L)
  fun snoozeCount(ctx: Context) = prefs(ctx).getInt(K_SNOOZE_COUNT, 0)
  fun ringStartedAt(ctx: Context) = prefs(ctx).getLong(K_RING_STARTED_AT, 0L)
  /** When this alarm first started ringing (kept across snoozes); drives the 90-minute limit. */
  fun sessionStartedAt(ctx: Context) = prefs(ctx).getLong(K_SESSION_STARTED_AT, 0L)

  /** A brand-new ring: resets the snooze counter. */
  fun startNewRing(ctx: Context, isTest: Boolean) {
    val now = System.currentTimeMillis()
    prefs(ctx).edit()
      .putString(K_STATE, STATE_RINGING)
      .putLong(K_RING_STARTED_AT, now)
      .putLong(K_SESSION_STARTED_AT, now)
      .putInt(K_SNOOZE_COUNT, 0)
      .putLong(K_SNOOZE_UNTIL, 0L)
      .putBoolean(K_IS_TEST, isTest)
      .commit()
  }

  /** Ringing again after a snooze, or a real alarm taking over an active ring. */
  fun resumeRing(ctx: Context, clearTestFlag: Boolean = false) {
    val now = System.currentTimeMillis()
    val e = prefs(ctx).edit()
      .putString(K_STATE, STATE_RINGING)
      .putLong(K_RING_STARTED_AT, now)
      .putLong(K_SNOOZE_UNTIL, 0L)
    // A real alarm taking over (e.g. from a test ring) starts its own 90-minute window.
    if (clearTestFlag) e.putBoolean(K_IS_TEST, false).putLong(K_SESSION_STARTED_AT, now)
    if (sessionStartedAt(ctx) == 0L) e.putLong(K_SESSION_STARTED_AT, now)
    e.commit()
  }

  fun startSnooze(ctx: Context, until: Long) {
    prefs(ctx).edit()
      .putString(K_STATE, STATE_SNOOZED)
      .putLong(K_SNOOZE_UNTIL, until)
      .putInt(K_SNOOZE_COUNT, snoozeCount(ctx) + 1)
      .commit()
  }

  fun setIdle(ctx: Context) {
    prefs(ctx).edit()
      .putString(K_STATE, STATE_IDLE)
      .putLong(K_SNOOZE_UNTIL, 0L)
      .putInt(K_SNOOZE_COUNT, 0)
      .putLong(K_RING_STARTED_AT, 0L)
      .putLong(K_SESSION_STARTED_AT, 0L)
      .putBoolean(K_IS_TEST, false)
      .commit()
  }

  // ---- optional volume boost (default OFF) ----

  fun isVolumeBoostEnabled(ctx: Context) = prefs(ctx).getBoolean(K_VOLUME_BOOST, false)

  fun setVolumeBoostEnabled(ctx: Context, enabled: Boolean) {
    prefs(ctx).edit().putBoolean(K_VOLUME_BOOST, enabled).commit()
  }

  /** -1 when there is nothing to restore. */
  fun volumeRestoreTo(ctx: Context) = prefs(ctx).getInt(K_VOL_RESTORE_TO, -1)
  fun volumeSetTo(ctx: Context) = prefs(ctx).getInt(K_VOL_SET_TO, -1)

  fun recordVolumeBoost(ctx: Context, restoreTo: Int, setTo: Int) {
    prefs(ctx).edit().putInt(K_VOL_RESTORE_TO, restoreTo).putInt(K_VOL_SET_TO, setTo).commit()
  }

  fun clearVolumeBoost(ctx: Context) {
    prefs(ctx).edit().remove(K_VOL_RESTORE_TO).remove(K_VOL_SET_TO).commit()
  }

  // TESTING-ONLY START
  fun isTestRing(ctx: Context) = prefs(ctx).getBoolean(K_IS_TEST, false)
  fun testRingAt(ctx: Context) = prefs(ctx).getLong(K_TEST_AT, 0L)
  fun setTestRingAt(ctx: Context, at: Long) {
    prefs(ctx).edit().putLong(K_TEST_AT, at).commit()
  }
  // TESTING-ONLY END

  fun snapshot(ctx: Context): Map<String, Any?> = mapOf(
    "state" to state(ctx),
    "armed" to isArmed(ctx),
    "hour" to hour(ctx),
    "minute" to minute(ctx),
    "days" to days(ctx),
    "snoozeUntil" to snoozeUntil(ctx).toDouble(),
    "snoozeCount" to snoozeCount(ctx),
    "ringStartedAt" to ringStartedAt(ctx).toDouble(),
    "nextTriggerAt" to nextTriggerAt(ctx).toDouble(),
    "sessionStartedAt" to sessionStartedAt(ctx).toDouble(),
    "volumeBoostEnabled" to isVolumeBoostEnabled(ctx),
    // TESTING-ONLY START
    "isTestRing" to isTestRing(ctx),
    "testRingAt" to testRingAt(ctx).toDouble()
    // TESTING-ONLY END
  )
}
