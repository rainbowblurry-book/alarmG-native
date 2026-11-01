package expo.modules.clockguardalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import java.text.DateFormat
import java.util.Date

object AlarmNotifications {
  /** Silent high-importance channel: the service plays the sound itself. */
  private const val CH_RINGING = "clockguard_ringing_v2"
  /** Used only if the ring service could not start: the notification itself loops the sound. */
  private const val CH_FALLBACK = "clockguard_fallback_v2"
  private const val CH_SNOOZED = "clockguard_snoozed_v2"

  const val ID_RINGING = 9201
  const val ID_RELAUNCH = 9202
  const val ID_FALLBACK = 9203
  const val ID_SNOOZED = 9204

  private const val REQ_FULLSCREEN = 9301
  private const val REQ_RELAUNCH = 9302
  private const val REQ_OPEN = 9303

  private const val TITLE = "ClockGuard: wake up!"
  private const val BODY = "Do your wake-up mission to turn the alarm off."
  // TESTING-ONLY START
  private const val TEST_TITLE = "ClockGuard TEST alarm"
  // TESTING-ONLY END

  private fun title(ctx: Context): String =
    if (AlarmStore.isTestRing(ctx)) TEST_TITLE else TITLE

  private fun nm(ctx: Context) = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  fun ensureChannels(ctx: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = nm(ctx)

    val ringing = NotificationChannel(CH_RINGING, "Alarm ringing", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Shown while the alarm rings. Opens the alarm screen."
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setBypassDnd(true)
    }
    val fallback = NotificationChannel(CH_FALLBACK, "Alarm (backup sound)", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Only used if the alarm sound service could not start."
      setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 800, 400, 800)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setBypassDnd(true)
    }
    val snoozed = NotificationChannel(CH_SNOOZED, "Alarm snoozed", NotificationManager.IMPORTANCE_LOW).apply {
      description = "Shows when a snoozed alarm will ring again."
      setSound(null, null)
      enableVibration(false)
    }
    nm.createNotificationChannels(listOf(ringing, fallback, snoozed))
  }

  private fun fullScreenPendingIntent(ctx: Context, requestCode: Int): PendingIntent =
    PendingIntent.getActivity(
      ctx, requestCode, AlarmLauncher.launchIntent(ctx, fromAlarm = true),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

  private fun ringingBuilder(ctx: Context, channel: String, requestCode: Int): NotificationCompat.Builder {
    val pi = fullScreenPendingIntent(ctx, requestCode)
    return NotificationCompat.Builder(ctx, channel)
      .setSmallIcon(ctx.applicationInfo.icon)
      .setContentTitle(title(ctx))
      .setContentText(BODY)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setFullScreenIntent(pi, true)
      .setContentIntent(pi)
      .setOngoing(true)
      .setAutoCancel(false)
      .setShowWhen(true)
      .setWhen(System.currentTimeMillis())
  }

  /** Notification attached to the foreground ring service. */
  fun ringing(ctx: Context): Notification {
    ensureChannels(ctx)
    return ringingBuilder(ctx, CH_RINGING, REQ_FULLSCREEN)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  /**
   * Posts a fresh full-screen notification. Android only launches a full-screen
   * intent for a NEW notification while the screen is off/locked, so this is
   * what brings the ringing screen back after the power button is pressed.
   */
  fun relaunch(ctx: Context) {
    ensureChannels(ctx)
    val nm = nm(ctx)
    nm.cancel(ID_RELAUNCH)
    runCatching {
      nm.notify(ID_RELAUNCH, ringingBuilder(ctx, CH_RINGING, REQ_RELAUNCH).setTimeoutAfter(60_000).build())
    }
  }

  fun showFallbackRinging(ctx: Context) {
    ensureChannels(ctx)
    val n = ringingBuilder(ctx, CH_FALLBACK, REQ_FULLSCREEN).build()
    n.flags = n.flags or Notification.FLAG_INSISTENT // loop the channel sound until opened/cancelled
    runCatching { nm(ctx).notify(ID_FALLBACK, n) }
  }

  fun showSnoozed(ctx: Context, until: Long) {
    ensureChannels(ctx)
    val open = PendingIntent.getActivity(
      ctx, REQ_OPEN, AlarmLauncher.launchIntent(ctx, fromAlarm = false),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val time = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(until))
    val n = NotificationCompat.Builder(ctx, CH_SNOOZED)
      .setSmallIcon(ctx.applicationInfo.icon)
      .setContentTitle("Alarm snoozed")
      .setContentText("Rings again at $time.")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(open)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()
    runCatching { nm(ctx).notify(ID_SNOOZED, n) }
  }

  fun cancelRinging(ctx: Context) {
    val nm = nm(ctx)
    nm.cancel(ID_RINGING)
    nm.cancel(ID_RELAUNCH)
    nm.cancel(ID_FALLBACK)
  }

  fun cancelSnoozed(ctx: Context) = nm(ctx).cancel(ID_SNOOZED)
}
