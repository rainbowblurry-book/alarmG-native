package expo.modules.clockguardalarm

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** One alarm in the list (multiple alarms, max [AlarmStore.MAX_ALARMS]). */
data class AlarmItem(val id: String, val hour: Int, val minute: Int, val days: List<Int>, val enabled: Boolean)

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
  const val MAX_ALARMS = 5

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
  private const val K_ALARMS = "alarms"
  private const val K_NEXT_ALARM_ID = "nextAlarmId"
  private const val K_RINGING_ALARM_ID = "ringingAlarmId"
  private const val K_LAST_MISSED_SESSION = "lastMissedSession"
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

  // ---- schedule: a list of alarms ----
  //
  // Older builds stored ONE alarm in K_ARMED/K_HOUR/K_MINUTE/K_DAYS. The first time the
  // list is read it is created from those keys (same time, days and on/off), so an
  // armed alarm stays armed across the update.

  fun alarms(ctx: Context): List<AlarmItem> {
    val p = prefs(ctx)
    val raw = p.getString(K_ALARMS, null)
    if (raw == null) {
      val migrated = if (p.contains(K_HOUR)) {
        listOf(AlarmItem("a1", p.getInt(K_HOUR, 7), p.getInt(K_MINUTE, 0), legacyDays(p), p.getBoolean(K_ARMED, false)))
      } else emptyList()
      saveAlarms(ctx, migrated)
      return migrated
    }
    return try {
      val arr = JSONArray(raw)
      (0 until arr.length()).mapNotNull { i ->
        val o = arr.optJSONObject(i) ?: return@mapNotNull null
        val h = o.optInt("h", -1)
        val m = o.optInt("m", -1)
        if (h !in 0..23 || m !in 0..59) return@mapNotNull null
        val d = o.optJSONArray("d")
        val days = if (d == null) emptyList() else (0 until d.length()).map { d.optInt(it, -1) }.filter { it in 0..6 }.distinct().sorted()
        AlarmItem(o.optString("id", "a${i + 1}"), h, m, days, o.optBoolean("on", false))
      }.take(MAX_ALARMS)
    } catch (e: Exception) {
      emptyList()
    }
  }

  private fun legacyDays(p: SharedPreferences): List<Int> =
    (p.getString(K_DAYS, "") ?: "").split(",").mapNotNull { it.trim().toIntOrNull() }.filter { it in 0..6 }.distinct().sorted()

  fun saveAlarms(ctx: Context, list: List<AlarmItem>) {
    val arr = JSONArray()
    list.take(MAX_ALARMS).forEach { a ->
      arr.put(JSONObject().put("id", a.id).put("h", a.hour).put("m", a.minute).put("d", JSONArray(a.days)).put("on", a.enabled))
    }
    prefs(ctx).edit().putString(K_ALARMS, arr.toString()).commit()
  }

  /** True when at least one alarm is on. */
  fun isArmed(ctx: Context) = alarms(ctx).any { it.enabled }

  fun nextAlarmId(ctx: Context) = prefs(ctx).getString(K_NEXT_ALARM_ID, "") ?: ""
  fun ringingAlarmId(ctx: Context) = prefs(ctx).getString(K_RINGING_ALARM_ID, "") ?: ""

  fun setNextAlarmId(ctx: Context, id: String) {
    prefs(ctx).edit().putString(K_NEXT_ALARM_ID, id).commit()
  }

  fun setRingingAlarmId(ctx: Context, id: String) {
    prefs(ctx).edit().putString(K_RINGING_ALARM_ID, id).commit()
  }

  /** Session start of the last ring that hit the 90-minute limit (for streaks). */
  fun lastMissedSession(ctx: Context) = prefs(ctx).getLong(K_LAST_MISSED_SESSION, 0L)

  fun setLastMissedSession(ctx: Context, session: Long) {
    prefs(ctx).edit().putLong(K_LAST_MISSED_SESSION, session).commit()
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
      .putString(K_RINGING_ALARM_ID, "")
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

  fun snapshot(ctx: Context): Map<String, Any?> {
    val list = alarms(ctx)
    val now = System.currentTimeMillis()
    // Legacy single-alarm fields describe the next alarm (or the first one).
    val primary = list.firstOrNull { it.id == nextAlarmId(ctx) } ?: list.firstOrNull { it.enabled } ?: list.firstOrNull()
    return mapOf(
    "state" to state(ctx),
    "armed" to list.any { it.enabled },
    "hour" to (primary?.hour ?: 7),
    "minute" to (primary?.minute ?: 0),
    "days" to (primary?.days ?: emptyList<Int>()),
    "alarms" to list.map { a ->
      mapOf(
        "id" to a.id,
        "hour" to a.hour,
        "minute" to a.minute,
        "days" to a.days,
        "enabled" to a.enabled,
        "nextTriggerAt" to (if (a.enabled) (AlarmScheduler.nextTrigger(a.hour, a.minute, a.days, now) ?: 0L) else 0L).toDouble()
      )
    },
    "nextAlarmId" to nextAlarmId(ctx),
    "ringingAlarmId" to ringingAlarmId(ctx),
    "lastMissedSession" to lastMissedSession(ctx).toDouble(),
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
}
