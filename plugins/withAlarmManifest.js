const { withAndroidManifest } = require('@expo/config-plugins');

function withAlarmManifest(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application?.[0];
    if (!application || !application.activity) {
      return config;
    }

    const mainActivity = application.activity.find((activity) =>
      activity.$['android:name']?.endsWith('MainActivity')
    );

    // MainActivity is the normal app surface. It must not stay visible over
    // Android's lock screen or wake the display during ordinary app use.
    // A future, dedicated AlarmActivity will own these flags only while an
    // alarm is genuinely ringing.
    if (mainActivity) {
      delete mainActivity.$['android:showWhenLocked'];
      delete mainActivity.$['android:turnScreenOn'];
    }

    return config;
  });
}

module.exports = withAlarmManifest;
