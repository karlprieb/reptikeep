const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const MARKER = "// reptikeep-scene-delegate";

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)

    for context in connectionOptions.urlContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      RCTLinkingManager.application(
        UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
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
