const fs = require("fs");
const path = require("path");
const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");

const GRADLE_FILE = "release-signing.gradle";
const APPLY_LINE = `apply from: "${GRADLE_FILE}"`;

module.exports = function withAndroidReleaseSigning(config) {
  config = withDangerousMod(config, [
    "android",
    (modConfig) => {
      fs.copyFileSync(
        path.join(__dirname, GRADLE_FILE),
        path.join(modConfig.modRequest.platformProjectRoot, "app", GRADLE_FILE)
      );
      return modConfig;
    },
  ]);

  return withAppBuildGradle(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes(APPLY_LINE)) {
      modConfig.modResults.contents += `\n${APPLY_LINE}\n`;
    }
    return modConfig;
  });
};
