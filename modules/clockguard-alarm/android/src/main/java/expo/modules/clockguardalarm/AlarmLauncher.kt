package expo.modules.clockguardalarm

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import java.util.concurrent.CopyOnWriteArraySet

/** Builds the intent that opens the app (MainActivity) without knowing its class name. */
object AlarmLauncher {
  const val EXTRA_FROM_ALARM = "clockguard_from_alarm"

  fun launchIntent(ctx: Context, fromAlarm: Boolean): Intent {
    val base = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
      ?: Intent(Intent.ACTION_MAIN).setPackage(ctx.packageName)
    return base.apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP
      )
      if (fromAlarm) putExtra(EXTRA_FROM_ALARM, true)
    }
  }
}

/**
 * In-process notifications of ring-state changes, so the JS module can emit an
 * event and the activity listener can toggle lock-screen flags immediately.
 */
object AlarmStateBus {
  private val listeners = CopyOnWriteArraySet<(Context) -> Unit>()
  private val main = Handler(Looper.getMainLooper())

  fun add(listener: (Context) -> Unit) { listeners.add(listener) }
  fun remove(listener: (Context) -> Unit) { listeners.remove(listener) }

  fun notifyChanged(ctx: Context) {
    val app = ctx.applicationContext
    main.post { listeners.forEach { runCatching { it(app) } } }
  }
}
