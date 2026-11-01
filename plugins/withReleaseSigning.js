const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Release signing from environment variables (DECISIONS D-27).
 * No keystore or password is ever stored in the repo. CI decodes the keystore
 * from GitHub Actions secrets into a temp file and sets:
 *   CLOCKGUARD_KEYSTORE_PATH, CLOCKGUARD_KEYSTORE_PASSWORD,
 *   CLOCKGUARD_KEY_ALIAS, CLOCKGUARD_KEY_PASSWORD
 * Without them (local builds), release falls back to the template's debug key,
 * and CI then treats the build as a compile check only (no installable APK).
 * Throws if the generated build.gradle no longer has the expected shape, so a
 * template change fails loudly instead of silently producing a wrongly signed APK.
 */
const RELEASE_SIGNING = `
        release {
            if (System.getenv("CLOCKGUARD_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CLOCKGUARD_KEYSTORE_PATH"))
                storePassword System.getenv("CLOCKGUARD_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CLOCKGUARD_KEY_ALIAS")
                keyPassword System.getenv("CLOCKGUARD_KEY_PASSWORD")
            }
        }`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('CLOCKGUARD_KEYSTORE_PATH')) return config;

    const signingAnchor = /(signingConfigs\s*\{\s*\n\s*debug\s*\{[^}]*\})/;
    if (!signingAnchor.test(contents)) {
      throw new Error('withReleaseSigning: signingConfigs.debug block not found in app/build.gradle');
    }
    contents = contents.replace(signingAnchor, `$1${RELEASE_SIGNING}`);

    const releaseUsesDebug = /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/;
    if (!releaseUsesDebug.test(contents)) {
      throw new Error('withReleaseSigning: release buildType signingConfig line not found in app/build.gradle');
    }
    contents = contents.replace(
      releaseUsesDebug,
      '$1signingConfig(System.getenv("CLOCKGUARD_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug)'
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withReleaseSigning;
