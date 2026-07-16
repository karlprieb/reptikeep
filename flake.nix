{
  description = "dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
          config.android_sdk.accept_license = true;
        };

        isDarwin = pkgs.stdenv.isDarwin;

        androidAbi = if pkgs.stdenv.hostPlatform.isAarch64 then "arm64-v8a" else "x86_64";
        androidApiLevel = "35";
        avdName = "Reptiroutine_API_${androidApiLevel}";
        avdDevice = "pixel_6";

        androidComposition = pkgs.androidenv.composeAndroidPackages {
          platformVersions = [ "35" "36" ];
          buildToolsVersions = [ "35.0.0" "36.0.0" ];
          includeEmulator = true;
          includeNDK = true;
          ndkVersions = [ "27.1.12297006" ];
          includeSystemImages = true;
          systemImageTypes = [ "google_apis" ];
          abiVersions = [ androidAbi ];
          cmakeVersions = [ "3.22.1" ];
        };

        androidSdk = androidComposition.androidsdk;

        androidAvd = pkgs.writeShellApplication {
          name = "android-avd";
          text = ''
            : "''${ANDROID_HOME:?ANDROID_HOME is not set — run this inside 'nix develop'}"

            shopt -s nullglob
            cmdline_tools_bins=("$ANDROID_HOME"/cmdline-tools/*/bin/avdmanager)
            if [ ''${#cmdline_tools_bins[@]} -eq 0 ]; then
              echo "error: no avdmanager found under $ANDROID_HOME/cmdline-tools/*/bin" >&2
              exit 1
            fi
            avdmanager="''${cmdline_tools_bins[0]}"
            emulator="$ANDROID_HOME/emulator/emulator"
            package="system-images;android-${androidApiLevel};google_apis;${androidAbi}"

            if ! "$avdmanager" list avd | grep -q "Name: ${avdName}$"; then
              echo "Creating AVD '${avdName}' ($package, device=${avdDevice})..."
              echo "no" | "$avdmanager" create avd \
                --name "${avdName}" \
                --package "$package" \
                --device "${avdDevice}" \
                --force
            fi

            "$ANDROID_HOME/platform-tools/adb" start-server

            echo "Starting emulator '${avdName}'..."
            exec "$emulator" -avd "${avdName}" "$@"
          '';
        };
      in
      {
        devShells.default = pkgs.mkShellNoCC {
          buildInputs = with pkgs; [
            nodejs_22
            watchman
            jdk17
            androidSdk
            androidAvd
            typescript-language-server
            maestro
          ]
          ++ lib.optionals isDarwin [
            cocoapods
            ruby
          ];

          DO_NOT_TRACK = "1";

          ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
          ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
          ANDROID_NDK_ROOT = "${androidSdk}/libexec/android-sdk/ndk-bundle";
          JAVA_HOME = pkgs.jdk17.home;

          shellHook = ''
            export PATH="$ANDROID_HOME/platform-tools:$PATH"
            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
        };
      });
}
