const { withXcodeProject } = require("expo/config-plugins");

const PHASE_NAME = "[Expo Dev Launcher] Strip Local Network Keys for Release";

module.exports = function withDevLauncherScriptAlwaysRun(config) {
  return withXcodeProject(config, (modConfig) => {
    const phases =
      modConfig.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    for (const phase of Object.values(phases)) {
      if (
        typeof phase === "object" &&
        phase.name?.replace(/"/g, "") === PHASE_NAME
      ) {
        phase.alwaysOutOfDate = 1;
      }
    }
    return modConfig;
  });
};
