package expo.modules.clockguardalarm

import android.content.Context
import android.media.AudioManager
import android.util.Log
import kotlin.math.ceil

/**
 * Optional "raise low alarm volume to 60% when ringing starts" (DECISIONS D-30).
 *  - OFF by default; only the ALARM stream is touched (never media/ringtone/notification).
 *  - Raised ONCE at ring start, never forced again during the ring.
 *  - The previous value is persisted, so it can be restored on snooze/disarm even
 *    after a crash or restart. If the user changed the volume during the ring, their
 *    choice is kept and nothing is restored.
 */
object VolumeBoost {
  private const val TAG = "ClockGuard"
  private const val TARGET_FRACTION = 0.60

  fun applyAtRingStart(ctx: Context) {
    if (!AlarmStore.isVolumeBoostEnabled(ctx)) return
    // A boost from an earlier, interrupted ring is still recorded: keep the ORIGINAL value.
    if (AlarmStore.volumeRestoreTo(ctx) >= 0) return
    try {
      val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      if (max <= 0) return
      val target = ceil(max * TARGET_FRACTION).toInt().coerceIn(1, max)
      val current = am.getStreamVolume(AudioManager.STREAM_ALARM)
      if (current >= target) return
      am.setStreamVolume(AudioManager.STREAM_ALARM, target, 0)
      val actual = am.getStreamVolume(AudioManager.STREAM_ALARM)
      if (actual != current) AlarmStore.recordVolumeBoost(ctx, restoreTo = current, setTo = actual)
    } catch (e: Exception) {
      // e.g. SecurityException under some Do Not Disturb policies: ring at the current volume.
      Log.w(TAG, "Volume boost not applied", e)
    }
  }

  /** Safe to call any number of times; clears the record whatever happens. */
  fun restore(ctx: Context) {
    val restoreTo = AlarmStore.volumeRestoreTo(ctx)
    if (restoreTo < 0) return
    try {
      val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val current = am.getStreamVolume(AudioManager.STREAM_ALARM)
      if (current == AlarmStore.volumeSetTo(ctx)) {
        am.setStreamVolume(AudioManager.STREAM_ALARM, restoreTo, 0)
      } // else: the user changed it during the ring; keep their choice.
    } catch (e: Exception) {
      Log.w(TAG, "Volume restore failed", e)
    } finally {
      AlarmStore.clearVolumeBoost(ctx)
    }
  }
}
