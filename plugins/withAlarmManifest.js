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

    if (mainActivity) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }

    return config;
  });
}

module.exports = withAlarmManifest;
