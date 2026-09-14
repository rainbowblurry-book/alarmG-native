const { withMainActivity, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds a tiny native module ("LockScreenBypass") that lets JS toggle
 * Activity.setShowWhenLocked()/setTurnScreenOn() at RUNTIME. This replaces
 * static manifest attributes: the app behaves like a normal app (goes to
 * background when phone is locked) UNLESS JS explicitly calls
 * LockScreenBypass.setEnabled(true) — which WakeFlowContext does only
 * while status is 'ringing' or 'snoozed'.
 *
 * v2 fix: withPackageRegistration now targets this project's actual
 * MainApplication.kt template, which uses:
 *   packageList = PackageList(this).packages.apply { ... }
 * (the new-architecture / ExpoReactHostFactory template). The previous
 * version only matched an older `val packages = PackageList(this).packages`
 * / `return PackageList(this).packages` pattern that does not exist here,
 * so the package was silently never added — confirmed via the generated
 * MainApplication.kt pasted by the user (import present, add() call missing).
 */
function withLockScreenBypass(config) {
  config = withNativeModuleFile(config);
  config = withPackageRegistration(config);
  config = withMainActivityCompanion(config);
  return config;
}

function withNativeModuleFile(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const pkg = config.android.package;
      const pkgPath = pkg.replace(/\./g, '/');
      const dir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        pkgPath
      );
      fs.mkdirSync(dir, { recursive: true });

      const moduleFile = path.join(dir, 'LockScreenBypassModule.kt');
      fs.writeFileSync(
        moduleFile,
        `package ${pkg}

import android.os.Build
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LockScreenBypassModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "LockScreenBypass"

  @ReactMethod
  fun setEnabled(enabled: Boolean) {
    val activityRef = MainActivity.currentActivity ?: return
    val activity = activityRef.get() ?: return
    activity.runOnUiThread {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(enabled)
        activity.setTurnScreenOn(enabled)
      } else {
        val window = activity.window
        val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        if (enabled) window.addFlags(flags) else window.clearFlags(flags)
      }
    }
  }
}
`
      );

      const packageFile = path.join(dir, 'LockScreenBypassPackage.kt');
      fs.writeFileSync(
        packageFile,
        `package ${pkg}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LockScreenBypassPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(LockScreenBypassModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`
      );

      return config;
    },
  ]);
}

function withPackageRegistration(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    const pkg = config.android.package;

    // Only add the cross-file import if LockScreenBypassPackage lives in a
    // different package than MainApplication (same-package imports are
    // redundant/unnecessary in Kotlin and can trigger a lint warning).
    const importLine = `import ${pkg}.LockScreenBypassPackage`;
    const packageDeclMatch = contents.match(/^package\s+([\w.]+)/m);
    const ownPackage = packageDeclMatch ? packageDeclMatch[1] : null;
    if (ownPackage !== pkg && !contents.includes(importLine)) {
      contents = contents.replace(
        /^package .+$/m,
        (match) => `${match}\n\n${importLine}`
      );
    }

    if (!contents.includes('LockScreenBypassPackage()')) {
      // Matches this project's actual template:
      //   packageList = PackageList(this).packages.apply {
      //     // comment...
      //   }
      const applyBlockPattern = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      if (applyBlockPattern.test(contents)) {
        contents = contents.replace(
          applyBlockPattern,
          `$1\n            add(LockScreenBypassPackage())`
        );
      } else {
        // Fallback for older/alternate templates without .apply{} wrapping.
        const valPattern = /(val packages = PackageList\(this\)\.packages)/;
        const returnPattern = /(return\s+PackageList\(this\)\.packages)/;
        if (valPattern.test(contents)) {
          contents = contents.replace(
            valPattern,
            `$1\n              packages.add(LockScreenBypassPackage())`
          );
        } else if (returnPattern.test(contents)) {
          contents = contents.replace(
            returnPattern,
            `val packages = PackageList(this).packages\n              packages.add(LockScreenBypassPackage())\n              return packages`
          );
        }
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withMainActivityCompanion(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;
    const isKotlin = config.modResults.language === 'kt';

    if (isKotlin && !contents.includes('LockScreenBypass companion')) {
      if (!contents.includes('java.lang.ref.WeakReference')) {
        contents = contents.replace(
          /^package .+$/m,
          (match) => `${match}\n\nimport java.lang.ref.WeakReference`
        );
      }
      contents = contents.replace(
        /class MainActivity\s*:\s*([^\{]+)\{/,
        (match, extendsClause) =>
          `class MainActivity : ${extendsClause}{\n\n  // LockScreenBypass companion — tracks the live MainActivity instance\n  companion object {\n    var currentActivity: WeakReference<MainActivity>? = null\n  }\n`
      );
      contents = contents.replace(
        /(override fun onCreate\([^)]*\)\s*\{[^\n]*\n)/,
        `$1    currentActivity = WeakReference(this)\n`
      );
      if (contents.includes('override fun onDestroy')) {
        contents = contents.replace(
          /(override fun onDestroy\(\)\s*\{)/,
          `$1\n    currentActivity = null`
        );
      } else {
        contents = contents.replace(
          /(class MainActivity[\s\S]*?\{)/,
          `$1\n\n  override fun onDestroy() {\n    currentActivity = null\n    super.onDestroy()\n  }\n`
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withLockScreenBypass;
