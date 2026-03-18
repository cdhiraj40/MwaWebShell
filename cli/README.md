# Solana Mobile Web Shell CLI

Node 24 + TypeScript CLI for generating and building the Android WebView shell template in this repository.

Current scope:

- `init`: create a new Android project from the template
- `build`: run the generated Android project's Gradle build and auto-install missing Android toolchain pieces
- `doctor`: check the local Android/JDK toolchain and optionally install missing pieces

Bubblewrap compatibility approach:

- Accept a standard web `manifest.json`
- Accept a Bubblewrap-style `twa-manifest.json` through the same `--manifest` flag
- Reuse compatible metadata such as app name, start URL, package ID, signing key path, icons, and theme colors
- Preserve the Android application ID, even if the internal Kotlin package/namespace needs a safe rewrite for reserved words
- Do not generate a Trusted Web Activity project

Template sourcing approach:

- `init` clones the live template repository, then copies the Android template files into the target directory
- The default template source uses the SSH repo URL while the repository is private
- This keeps generation tied to a remote template instead of the caller's local checkout

## Development

```bash
cd cli
npm install
pnpm cli -- --help
npm run build
npm run test
```

## Commands

```bash
pnpm cli -- init ./my-app --manifest https://example.com/manifest.json
pnpm cli -- init ./my-app --manifest ./twa-manifest.json
pnpm cli -- build ./my-app
pnpm cli -- build ./my-app --release
pnpm cli -- doctor ./my-app --fix
pnpm smoke:apps
pnpm test:isolated-smoke
```

## Smoke Batch

`pnpm smoke:apps` generates the current manual smoke-test apps into `tmp/smoke-apps/`, creates a default `android.keystore` for each app using alias `android` and password `Android`, builds debug APKs, and runs `adb install -r` unless you pass `--skip-install`.

`pnpm test:isolated-smoke` is the SDK-isolation check. It points `ANDROID_SDK_ROOT` and `ANDROID_HOME` at a temp directory, runs the CFL smoke flow without `adb install`, and verifies that doctor downloaded command-line tools, platform-tools, build-tools, and platform packages into that temp SDK instead of using the normal local SDK.

## Toolchain setup

- `build` always runs the same preflight as `doctor --fix`
- the CLI checks for:
  - Gradle wrapper in the generated project
  - JDK 17+
  - Android SDK directory
  - Android command-line tools / `sdkmanager`
  - required SDK packages for this template:
    - `platform-tools`
    - `platforms;android-36`
    - `build-tools;36.0.0`
- if the Android command-line tools or SDK packages are missing, the CLI installs them automatically before building
- if no usable JDK is found, the CLI attempts to install a managed JDK 17 locally under `~/.mwa-webshell`

## Signing flow

- `init` prompts for a signing keystore path and key alias
- if the keystore file does not exist yet, `init` creates it and persists only the keystore path and alias into `twa-manifest.json`
- `build --release` and `build --bundle` use that saved signing metadata
- passwords are never persisted
- password resolution order is:
  - `WEB_SHELL_KEYSTORE_PASSWORD` / `WEB_SHELL_KEY_PASSWORD`
  - hidden interactive prompts during `build`
