package expo.modules.clockguardalarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import java.lang.ref.WeakReference

/** Autolinked by Expo (file name ends in Package.kt and implements expo Package). */
class ClockGuardEnginePackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context): List<ReactActivityLifecycleListener> =
    listOf(RingingActivityListener())
}

/**
 * Shows MainActivity over the lock screen and turns the screen on ONLY while
 * the alarm is ringing. Otherwise the app behaves like a normal app.
 * Replaces the old LockScreenBypass module and the MainActivity regex patches.
 */
class RingingActivityListener : ReactActivityLifecycleListener {
  private var activityRef: WeakReference<Activity>? = null

  private val onStateChanged: (Context) -> Unit = { _ ->
    activityRef?.get()?.let { applyFlags(it) }
  }

  override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
    activityRef = WeakReference(activity)
    AlarmStateBus.add(onStateChanged)
    applyFlags(activity)
  }

  override fun onResume(activity: Activity) {
    activityRef = WeakReference(activity)
    applyFlags(activity)
  }

  override fun onNewIntent(intent: Intent?): Boolean {
    activityRef?.get()?.let { applyFlags(it) }
    return false
  }

  override fun onDestroy(activity: Activity) {
    AlarmStateBus.remove(onStateChanged)
    if (activityRef?.get() === activity) activityRef = null
  }

  private fun applyFlags(activity: Activity) {
    val ringing = AlarmStore.state(activity) == AlarmStore.STATE_RINGING
    activity.runOnUiThread {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(ringing)
        activity.setTurnScreenOn(ringing)
      } else {
        @Suppress("DEPRECATION")
        val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        if (ringing) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
      }
      if (ringing) {
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else {
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      }
    }
  }
}
