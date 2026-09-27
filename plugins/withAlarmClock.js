const {
  withAndroidManifest,
  withMainActivity,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * withAlarmClock — real native alarm for ClockGuard.
 *
 * - AlarmManager.setAlarmClock() schedules the exact wake time (system alarm icon,
 *   wakes the device from Doze).
 * - ClockGuardAlarmReceiver fires at that time, posts a CATEGORY_ALARM notification
 *   with setFullScreenIntent() so MainActivity opens BY ITSELF over the lock screen,
 *   then schedules the next repeat day natively (no need to open the app).
 * - ClockGuardBootReceiver re-schedules after reboot / app update.
 * - AlarmLaunchHelper turns on showWhenLocked/turnScreenOn when MainActivity is
 *   started by the alarm, before JS has even loaded.
 * - JS module name: "ClockGuardAlarm" (see src/native/alarmClock.ts).
 *
 * Depends on withLockScreenBypass.js (uses MainActivity.currentActivity companion).
 */
function withAlarmClock(config) {
  config = withAlarmClockSource(config);
  config = withAlarmClockManifest(config);
  config = withAlarmClockPackageRegistration(config);
  config = withAlarmClockMainActivity(config);
  return config;
}

function kotlinSource(pkg) {
  return `package ${pkg}

import android.app.Activity
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ViewManager
import java.util.Calendar

data class ClockGuardSchedule(
  val hour: Int,
  val minute: Int,
  val days: List<Int>,
  val title: String,
  val body: String
)

object ClockGuardAlarmStore {
  private const val PREFS = "clockguard_alarm"
  private const val PENDING_WINDOW_MS = 15L * 60L * 1000L

  private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun save(ctx: Context, hour: Int, minute: Int, days: List<Int>, title: String, body: String) {
    prefs(ctx).edit()
      .putBoolean("armed", true)
      .putInt("hour", hour)
      .putInt("minute", minute)
      .putString("days", days.joinToString(","))
      .putString("title", title)
      .putString("body", body)
      .commit()
  }

  fun clear(ctx: Context) {
    prefs(ctx).edit().putBoolean("armed", false).commit()
  }

  fun load(ctx: Context): ClockGuardSchedule? {
    val p = prefs(ctx)
    if (!p.getBoolean("armed", false)) return null
    val days = (p.getString("days", "") ?: "")
      .split(",")
      .mapNotNull { it.trim().toIntOrNull() }
    return ClockGuardSchedule(
      p.getInt("hour", 7),
      p.getInt("minute", 0),
      days,
      p.getString("title", "ClockGuard") ?: "ClockGuard",
      p.getString("body", "") ?: ""
    )
  }

  fun markPendingRing(ctx: Context) {
    prefs(ctx).edit().putLong("pendingRingAt", System.currentTimeMillis()).commit()
  }

  fun consumePendingRing(ctx: Context): Boolean {
    val p = prefs(ctx)
    val at = p.getLong("pendingRingAt", 0L)
    if (at == 0L) return false
    p.edit().remove("pendingRingAt").commit()
    return System.currentTimeMillis() - at < PENDING_WINDOW_MS
  }
}

object ClockGuardAlarmScheduling {
  private const val REQ_FIRE = 8801
  private const val REQ_SHOW = 8802
  const val REQ_FULLSCREEN = 8803
  const val EXTRA_ALARM = "clockguard_alarm"

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

  fun launchIntent(ctx: Context, fromAlarm: Boolean): Intent {
    val i = Intent(ctx, MainActivity::class.java)
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    if (fromAlarm) i.putExtra(EXTRA_ALARM, true)
    return i
  }

  private fun fireIntent(ctx: Context): PendingIntent {
    val i = Intent(ctx, ClockGuardAlarmReceiver::class.java)
    i.action = ctx.packageName + ".CLOCKGUARD_ALARM_FIRE"
    return PendingIntent.getBroadcast(
      ctx, REQ_FIRE, i,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun showIntent(ctx: Context): PendingIntent =
    PendingIntent.getActivity(
      ctx, REQ_SHOW, launchIntent(ctx, false),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

  fun scheduleNext(ctx: Context): Long? {
    val s = ClockGuardAlarmStore.load(ctx) ?: return null
    val at = nextTrigger(s.hour, s.minute, s.days, System.currentTimeMillis()) ?: return null
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val op = fireIntent(ctx)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, op)
      } else {
        am.setAlarmClock(AlarmManager.AlarmClockInfo(at, showIntent(ctx)), op)
      }
    } catch (e: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, op)
    }
    return at
  }

  fun cancel(ctx: Context) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(fireIntent(ctx))
  }
}

object ClockGuardAlarmNotifier {
  private const val CHANNEL_ID = "clockguard-alarm-fullscreen"
  private const val NOTIFICATION_ID = 8804

  fun show(ctx: Context, title: String, body: String) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val ch = NotificationChannel(CHANNEL_ID, "Alarm (full screen)", NotificationManager.IMPORTANCE_HIGH)
      ch.setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      ch.enableVibration(true)
      ch.vibrationPattern = longArrayOf(0, 500, 250, 500)
      ch.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      ch.setBypassDnd(true)
      nm.createNotificationChannel(ch)
    }

    val fullScreen = PendingIntent.getActivity(
      ctx, ClockGuardAlarmScheduling.REQ_FULLSCREEN,
      ClockGuardAlarmScheduling.launchIntent(ctx, true),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val n = NotificationCompat.Builder(ctx, CHANNEL_ID)
      .setSmallIcon(ctx.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setFullScreenIntent(fullScreen, true)
      .setContentIntent(fullScreen)
      .setOngoing(true)
      .setAutoCancel(false)
      .build()

    try {
      nm.notify(NOTIFICATION_ID, n)
    } catch (e: SecurityException) {
      // POST_NOTIFICATIONS denied — nothing more we can do natively.
    }
  }

  fun cancel(ctx: Context) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.cancel(NOTIFICATION_ID)
  }
}

object AlarmLaunchHelper {
  fun applyIfAlarm(activity: Activity, intent: Intent?) {
    if (intent?.getBooleanExtra(ClockGuardAlarmScheduling.EXTRA_ALARM, false) == true) {
      apply(activity)
    }
  }

  fun apply(activity: Activity) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      activity.setShowWhenLocked(true)
      activity.setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      activity.window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
  }
}

class ClockGuardAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val s = ClockGuardAlarmStore.load(context) ?: return
    ClockGuardAlarmStore.markPendingRing(context)
    ClockGuardAlarmNotifier.show(
      context,
      s.title,
      if (s.body.isNotEmpty()) s.body else "Complete your wake-up mission to disarm."
    )
    // If the app is already alive in the background, make it able to show over the lock screen now.
    MainActivity.currentActivity?.get()?.let { a ->
      a.runOnUiThread { AlarmLaunchHelper.apply(a) }
    }
    // Schedule the next repeat day natively so repeats work without opening the app.
    ClockGuardAlarmScheduling.scheduleNext(context)
  }
}

class ClockGuardBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      ClockGuardAlarmScheduling.scheduleNext(context)
    }
  }
}

class ClockGuardAlarmModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ClockGuardAlarm"

  @ReactMethod
  fun schedule(hour: Int, minute: Int, days: ReadableArray, title: String, body: String, promise: Promise) {
    try {
      val list = mutableListOf<Int>()
      for (i in 0 until days.size()) list.add(days.getInt(i))
      ClockGuardAlarmScheduling.cancel(reactContext)
      ClockGuardAlarmStore.save(reactContext, hour, minute, list, title, body)
      val at = ClockGuardAlarmScheduling.scheduleNext(reactContext)
      promise.resolve(at?.toDouble())
    } catch (e: Exception) {
      promise.reject("SCHEDULE_FAILED", e)
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    ClockGuardAlarmScheduling.cancel(reactContext)
    ClockGuardAlarmStore.clear(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun consumePendingRing(promise: Promise) {
    promise.resolve(ClockGuardAlarmStore.consumePendingRing(reactContext))
  }

  @ReactMethod
  fun clearAlarmNotification() {
    ClockGuardAlarmNotifier.cancel(reactContext)
  }

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    if (Build.VERSION.SDK_INT >= 34) {
      val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      promise.resolve(nm.canUseFullScreenIntent())
    } else {
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun openFullScreenIntentSettings() {
    val uri = Uri.parse("package:" + reactContext.packageName)
    val intent = if (Build.VERSION.SDK_INT >= 34) {
      Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, uri)
    } else {
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri)
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      reactContext.startActivity(intent)
    } catch (e: Exception) {
      val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri)
      fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(fallback)
    }
  }
}

class ClockGuardAlarmPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ClockGuardAlarmModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;
}

function withAlarmClockSource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const pkg = config.android.package;
      const dir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        pkg.replace(/\./g, '/')
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'ClockGuardAlarm.kt'), kotlinSource(pkg));
      return config;
    },
  ]);
}

function withAlarmClockManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const pkg = config.android.package;

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    [
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
    ].forEach((name) => {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    });

    const application = manifest.application[0];
    application.receiver = application.receiver || [];
    const addReceiver = (receiver) => {
      const exists = application.receiver.some(
        (r) => r.$['android:name'] === receiver.$['android:name']
      );
      if (!exists) application.receiver.push(receiver);
    };

    addReceiver({
      $: {
        'android:name': `${pkg}.ClockGuardAlarmReceiver`,
        'android:exported': 'false',
      },
    });
    addReceiver({
      $: {
        'android:name': `${pkg}.ClockGuardBootReceiver`,
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
            { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
          ],
        },
      ],
    });

    return config;
  });
}

function withAlarmClockPackageRegistration(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('ClockGuardAlarmPackage()')) {
      const applyBlockPattern = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      if (applyBlockPattern.test(contents)) {
        contents = contents.replace(
          applyBlockPattern,
          `$1\n            add(ClockGuardAlarmPackage())`
        );
      } else {
        const valPattern = /(val packages = PackageList\(this\)\.packages)/;
        if (valPattern.test(contents)) {
          contents = contents.replace(
            valPattern,
            `$1\n              packages.add(ClockGuardAlarmPackage())`
          );
        }
      }
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withAlarmClockMainActivity(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    const isKotlin = config.modResults.language === 'kt';
    if (isKotlin && !contents.includes('AlarmLaunchHelper.applyIfAlarm')) {
      contents = contents.replace(
        /(super\.onCreate\([^)]*\))/,
        `$1\n    AlarmLaunchHelper.applyIfAlarm(this, intent)`
      );
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAlarmClock;
