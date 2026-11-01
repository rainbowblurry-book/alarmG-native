package expo.modules.clockguardalarm

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Foreground service that owns everything audible while the alarm rings.
 * The ringing UI can be closed, backgrounded, or the screen turned off: the
 * sound continues and the state stays RINGING until JS calls disarm() or
 * snooze() after the mission.
 *
 * Honest limits: Android "Force stop" kills the service and clears all alarms;
 * START_STICKY asks Android to restart the service after other kills but is not
 * a guarantee; OEM battery managers can interfere.
 */
class AlarmRingService : Service() {

  companion object {
    private const val TAG = "ClockGuard"
    private const val ACTION_START = "expo.modules.clockguardalarm.RING_START"
    private const val KEEPALIVE_INTERVAL_MS = 60_000L
    private const val WAKE_LOCK_TIMEOUT_MS = 10L * 60L * 1000L
    // Best-effort re-show after the power button: bounded, never a loop.
    private const val MAX_RELAUNCHES_PER_RING = 3
    private const val MIN_RELAUNCH_GAP_MS = 30_000L

    fun start(ctx: Context) {
      val i = Intent(ctx, AlarmRingService::class.java).setAction(ACTION_START)
      try {
        ContextCompat.startForegroundService(ctx, i)
      } catch (e: Exception) {
        Log.e(TAG, "Could not start ring service; using backup notification", e)
        AlarmNotifications.showFallbackRinging(ctx)
      }
    }

    fun stop(ctx: Context) {
      ctx.stopService(Intent(ctx, AlarmRingService::class.java))
      AlarmNotifications.cancelRinging(ctx)
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var ringing = false
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var focusRequest: AudioFocusRequest? = null
  private var screenReceiverRegistered = false
  private var relaunchCount = 0
  private var lastRelaunchAt = 0L

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action != Intent.ACTION_SCREEN_OFF) return
      val now = SystemClock.elapsedRealtime()
      if (relaunchCount >= MAX_RELAUNCHES_PER_RING) return
      if (lastRelaunchAt != 0L && now - lastRelaunchAt < MIN_RELAUNCH_GAP_MS) return
      relaunchCount += 1
      lastRelaunchAt = now
      handler.postDelayed({
        if (ringing && AlarmStore.state(this@AlarmRingService) == AlarmStore.STATE_RINGING) {
          AlarmNotifications.relaunch(this@AlarmRingService)
        }
      }, 500)
    }
  }

  private val keepAlive = object : Runnable {
    override fun run() {
      if (!ringing) return
      wakeLock?.acquire(WAKE_LOCK_TIMEOUT_MS) // extends the timeout (not reference counted)
      if (player != null && player?.isPlaying != true) runCatching { player?.start() }
      handler.postDelayed(this, KEEPALIVE_INTERVAL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForeground must be called promptly after startForegroundService(), always.
    if (!promoteToForeground()) {
      AlarmNotifications.showFallbackRinging(this)
      stopSelf()
      return START_NOT_STICKY
    }
    if (AlarmStore.state(this) != AlarmStore.STATE_RINGING) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (!ringing) startRinging()
    return START_STICKY
  }

  private fun promoteToForeground(): Boolean {
    val n = AlarmNotifications.ringing(this)
    val id = AlarmNotifications.ID_RINGING
    if (Build.VERSION.SDK_INT >= 34) {
      try {
        ServiceCompat.startForeground(this, id, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
        return true
      } catch (e: Exception) {
        Log.w(TAG, "systemExempted foreground type refused, trying mediaPlayback", e)
      }
    }
    if (Build.VERSION.SDK_INT >= 29) {
      return try {
        ServiceCompat.startForeground(this, id, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        true
      } catch (e: Exception) {
        Log.e(TAG, "mediaPlayback foreground type refused", e)
        false
      }
    }
    return try {
      startForeground(id, n)
      true
    } catch (e: Exception) {
      Log.e(TAG, "startForeground failed", e)
      false
    }
  }

  private fun startRinging() {
    ringing = true
    relaunchCount = 0
    lastRelaunchAt = 0L
    AlarmNotifications.cancelSnoozed(this)
    acquireWakeLock()
    VolumeBoost.applyAtRingStart(this)
    startSound()
    startVibration()
    registerScreenReceiver()
    // 90-minute limit, via an exact alarm so it still fires if this process is killed.
    runCatching { AlarmScheduler.scheduleRingTimeout(this) }
      .onFailure { Log.e(TAG, "Could not schedule ring time limit", it) }
    handler.postDelayed(keepAlive, KEEPALIVE_INTERVAL_MS)
    AlarmStateBus.notifyChanged(this)
  }

  private fun acquireWakeLock() {
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ClockGuard:ring").apply {
      setReferenceCounted(false)
      acquire(WAKE_LOCK_TIMEOUT_MS)
    }
  }

  private fun alarmAudioAttributes(): AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

  private fun startSound() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(alarmAudioAttributes())
        .setOnAudioFocusChangeListener { /* keep ringing regardless */ }
        .build()
      focusRequest = req
      runCatching { am.requestAudioFocus(req) }
    }

    player = createPlayer(useBundledTone = true) ?: createPlayer(useBundledTone = false)
    if (player == null) {
      Log.e(TAG, "No playable alarm sound; using backup notification sound")
      AlarmNotifications.showFallbackRinging(this)
    }
  }

  private fun createPlayer(useBundledTone: Boolean): MediaPlayer? {
    val mp = MediaPlayer()
    return try {
      mp.setAudioAttributes(alarmAudioAttributes())
      if (useBundledTone) {
        resources.openRawResourceFd(R.raw.clockguard_alarm_tone).use { afd ->
          mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
        }
      } else {
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
          ?: throw IllegalStateException("No default alarm sound")
        mp.setDataSource(this, uri)
      }
      mp.isLooping = true
      mp.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK)
      mp.prepare()
      mp.start()
      mp
    } catch (e: Exception) {
      Log.e(TAG, "MediaPlayer failed (bundled=$useBundledTone)", e)
      runCatching { mp.release() }
      null
    }
  }

  @Suppress("DEPRECATION")
  private fun startVibration() {
    val v: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    vibrator = v
    if (v == null || !v.hasVibrator()) return
    val pattern = longArrayOf(0, 800, 600)
    try {
      when {
        Build.VERSION.SDK_INT >= 33 ->
          v.vibrate(
            VibrationEffect.createWaveform(pattern, 0),
            VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM)
          )
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
          v.vibrate(VibrationEffect.createWaveform(pattern, 0), alarmAudioAttributes())
        else -> v.vibrate(pattern, 0)
      }
    } catch (e: Exception) {
      Log.w(TAG, "Vibration failed", e)
    }
  }

  private fun registerScreenReceiver() {
    if (screenReceiverRegistered) return
    ContextCompat.registerReceiver(
      this, screenReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF), ContextCompat.RECEIVER_NOT_EXPORTED
    )
    screenReceiverRegistered = true
  }

  override fun onDestroy() {
    ringing = false
    handler.removeCallbacksAndMessages(null)
    if (screenReceiverRegistered) {
      runCatching { unregisterReceiver(screenReceiver) }
      screenReceiverRegistered = false
    }
    runCatching { player?.stop() }
    runCatching { player?.release() }
    player = null
    runCatching { vibrator?.cancel() }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
      focusRequest?.let { runCatching { am.abandonAudioFocusRequest(it) } }
    }
    // Only restore the volume when the ring is really over (snooze/disarm/test stop).
    // If Android stopped the service while still RINGING, keep the record so the
    // restarted ring doesn't overwrite the original value.
    if (AlarmStore.state(this) != AlarmStore.STATE_RINGING) VolumeBoost.restore(this)
    runCatching { if (wakeLock?.isHeld == true) wakeLock?.release() }
    wakeLock = null
    runCatching { ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE) }
    AlarmNotifications.cancelRinging(this)
    super.onDestroy()
  }
}
