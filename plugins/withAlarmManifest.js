const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * REPLACES the old withAlarmManifest.js.
 *
 * Old behavior (BUG): set android:showWhenLocked="true" and
 * android:turnScreenOn="true" as STATIC attributes on MainActivity.
 * That makes MainActivity show over the lock screen on EVERY resume,
 * not just when an alarm is actually ringing — which is why locking
 * the phone behaved abnormally.
 *
 * New behavior: MainActivity gets NO static lock-screen attributes,
 * so it behaves like any normal app (goes to background on lock).
 * The USE_FULL_SCREEN_INTENT permission is kept (required for
 * expo-notifications to be able to launch over the lock screen at
 * ring time). Actual lock-screen bypass is now controlled at RUNTIME
 * by the companion withLockScreenBypass.js plugin + native module,
 * driven from WakeFlowContext.
 */
function withAlarmManifest(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;

    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const hasFullScreenIntentPerm = manifest['uses-permission'].some(
      (p) => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT'
    );
    if (!hasFullScreenIntentPerm) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' },
      });
    }

    const application = manifest.application?.[0];
    if (application?.activity) {
      application.activity.forEach((activity) => {
        if (activity.$['android:name'] === '.MainActivity') {
          // Explicitly remove any stale static lock-screen attributes
          // left over from the previous version of this plugin/config.
          delete activity.$['android:showWhenLocked'];
          delete activity.$['android:turnScreenOn'];
        }
      });
    }

    return config;
  });
}

module.exports = withAlarmManifest;
