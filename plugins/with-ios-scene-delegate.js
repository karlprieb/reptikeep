// This plugin only rewrites AppDelegate.swift when MARKER is absent (see withSceneAppDelegate
// below) - that check short-circuits before the template regexes run, so an incremental
// `expo prebuild` on a stale generated `ios/` silently keeps whatever SceneDelegate was there
// before. Whenever this template changes, prebuild from a clean `ios/` (delete it, or
// `expo prebuild --clean`) or the new template will not take effect.

const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const MARKER = "// reptikeep-scene-delegate";

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  // UIKit stops calling the UIApplicationDelegate open-url / continue-userActivity methods once
  // UIApplicationSceneManifest exists, so ExpoAppDelegateSubscriberManager (which fans a URL out
  // to every ExpoAppDelegateSubscriber, including expo-linking) and RCTLinkingManager (React
  // Native's own Linking listeners) never fire unless we call them here ourselves. This mirrors
  // what AppDelegate.swift's own "open url" / "continue userActivity" overrides do for the
  // non-scene case.
  private func deliver(url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) {
    _ = ExpoAppDelegateSubscriberManager.application(UIApplication.shared, open: url, options: options)
    _ = RCTLinkingManager.application(UIApplication.shared, open: url, options: options)
  }

  private func deliver(userActivity: NSUserActivity) {
    _ = ExpoAppDelegateSubscriberManager.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    _ = RCTLinkingManager.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  private func openURLOptions(for context: UIOpenURLContext) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = context.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = context.options.annotation {
      options[.annotation] = annotation
    }
    return options
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      assertionFailure(
        "reptikeep-scene-delegate: willConnectTo could not resolve the window scene, " +
          "AppDelegate, or reactNativeFactory. React Native will never start and the window " +
          "will stay permanently black.")
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Deliver any launch URL/activity BEFORE startReactNative. ExpoLinkingRegistry.initialURL is
    // pull-based - expo-linking / expo-router read it once when JS mounts - so it has to be set
    // before that mount happens, not after. Getting this order backwards reproduces the bug.
    for context in connectionOptions.urlContexts {
      deliver(url: context.url, options: openURLOptions(for: context))
    }
    for activity in connectionOptions.userActivities {
      deliver(userActivity: activity)
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      deliver(url: context.url, options: openURLOptions(for: context))
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    deliver(userActivity: userActivity)
  }
}
`;

const WINDOW_RE =
  /^[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\r?\n/m;
const START_RN_RE =
  /^[ \t]*factory\.startReactNative\(\r?\n[\s\S]*?launchOptions: launchOptions\)\r?\n/m;

const NEW_WINDOW_LINE = `    self.launchOptions = launchOptions
`;

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    for (const [re, what] of [
      [WINDOW_RE, "window creation"],
      [START_RN_RE, "startReactNative call"],
    ]) {
      if (!re.test(contents)) {
        throw new Error(
          `with-ios-scene-delegate: AppDelegate.swift does not contain the expected ${what}; ` +
            "the Expo template changed and this plugin needs updating",
        );
      }
    }

    contents = contents
      .replace(WINDOW_RE, NEW_WINDOW_LINE)
      .replace(START_RN_RE, "");

    // ExpoAppDelegateSubscriberManager lives in ExpoModulesCore. AppDelegate.swift's generated
    // `internal import Expo` already re-exports it (Expo.swift does
    // `@_exported import ExpoModulesCore`), so it resolves in SceneDelegate below with no new
    // import. Do not add an explicit `import ExpoModulesCore` - Swift's access-level-import check
    // treats that as ambiguous against the implicit internal import already pulled in through the
    // re-export and fails the build ("ambiguous implicit access level for import of
    // 'ExpoModulesCore'; it is imported as 'internal' elsewhere").

    const anchor = "  var window: UIWindow?\n";
    if (!contents.includes(anchor)) {
      throw new Error(
        "with-ios-scene-delegate: could not find AppDelegate's window property",
      );
    }
    contents = contents.replace(
      anchor,
      anchor + "  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n",
    );

    cfg.modResults.contents = contents + SCENE_DELEGATE;
    return cfg;
  });

const withSceneManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });

module.exports = function withIosSceneDelegate(config) {
  return withSceneManifest(withSceneAppDelegate(config));
};
