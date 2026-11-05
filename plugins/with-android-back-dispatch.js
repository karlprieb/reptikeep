// RN 0.88's ReactActivity registers its back-press callback with the
// OnBackPressedDispatcher only when the device runs API 36+; with predictive
// back's manifest flag on, API 35- devices therefore fall through to the
// system fallback and Back exits the app instead of popping. Registering our
// own callback (which routes into ReactActivity.onBackPressed → JS
// hardwareBackPress) covers every API level under both dispatch regimes.
//
// The callback must be disabled while the default handler runs: at a root
// screen JS declines the event, RN posts invokeDefaultOnBackPressed, and
// super.onBackPressed() walks the dispatcher again — with the callback still
// enabled that would loop between native and JavaScript forever.

const { withMainActivity } = require("expo/config-plugins");

const MARKER = "// reptikeep-back-dispatch";

const DEFAULT_HANDLER = `
${MARKER}
  override fun invokeDefaultOnBackPressed() {
    reptikeepBackCallback.isEnabled = false
    try {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
        if (!moveTaskToBack(false)) {
          // For non-root activities, use the default implementation to finish them.
          super.invokeDefaultOnBackPressed()
        }
        return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
    } finally {
      reptikeepBackCallback.isEnabled = true
    }
  }
`;

const withAndroidBackDispatch = (config) =>
  withMainActivity(config, (mod) => {
    let contents = mod.modResults.contents;
    if (contents.includes(MARKER)) {
      return mod;
    }

    const classAnchor = "class MainActivity : ReactActivity() {";
    if (!contents.includes(classAnchor)) {
      throw new Error(
        "with-android-back-dispatch: MainActivity template changed; " +
          "the plugin needs updating",
      );
    }

    const callback = `
${MARKER}
  private val reptikeepBackCallback =
    object : androidx.activity.OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        onBackPressed()
      }
    }
`;

    contents = contents.replace(classAnchor, classAnchor + callback);

    const superCall = "super.onCreate(null)";
    if (!contents.includes(superCall)) {
      throw new Error(
        "with-android-back-dispatch: could not find MainActivity.onCreate's " +
          "super call; the plugin needs updating",
      );
    }

    contents = contents.replace(
      superCall,
      superCall +
        "\n    onBackPressedDispatcher.addCallback(this, reptikeepBackCallback)",
    );

    const handlerRe =
      / {2}override fun invokeDefaultOnBackPressed\(\) \{[\s\S]*?\n {2}\}\n/;
    if (!handlerRe.test(contents)) {
      throw new Error(
        "with-android-back-dispatch: could not find the generated " +
          "invokeDefaultOnBackPressed; the plugin needs updating",
      );
    }
    contents = contents.replace(handlerRe, DEFAULT_HANDLER);

    mod.modResults.contents = contents;
    return mod;
  });

module.exports = withAndroidBackDispatch;
