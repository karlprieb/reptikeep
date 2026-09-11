fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android apk

```sh
[bundle exec] fastlane android apk
```

Build a release APK

### android aab

```sh
[bundle exec] fastlane android aab
```

Build a release AAB

----


## iOS

### ios certs

```sh
[bundle exec] fastlane ios certs
```

Generate/fetch the Apple Distribution cert and provisioning profile via match

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload a release build to TestFlight

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
