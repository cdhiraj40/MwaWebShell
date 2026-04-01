# Solana Mobile Web Shell CLI

Solana Mobile Web Shell is a Command Line Interface (CLI) that helps developers generate an Android app project that wraps an existing web app or website inside an Android WebView.

## Install

```bash
npm install -g @solanamobile/webshell-cli
```

## Commands

```bash
mwa-webshell init ./my-app --manifest https://example.com/manifest.json
mwa-webshell init ./my-app --manifest ./twa-manifest.json
mwa-webshell init ./my-app --version-code 12 --version-name 1.2.0
mwa-webshell build ./my-app
mwa-webshell build ./my-app --release
mwa-webshell doctor ./my-app --fix
```

## Supported Input

- standard web `manifest.json`
- Bubblewrap-style `twa-manifest.json`
- direct website or web app URL overrides through `--url`

The CLI reuses compatible metadata such as app name, start URL, package ID, signing key path, icons, and theme colors. It always generates an Android WebView shell project, not a Trusted Web Activity.

## Toolchain Setup

- `build` always runs the same preflight as `doctor --fix`
- the CLI checks for:
  - Gradle wrapper in the generated project
  - JDK 17+
  - Android SDK directory
  - Android command-line tools / `sdkmanager`
  - required SDK packages for this project:
    - `platform-tools`
    - `platforms;android-36`
    - `build-tools;36.0.0`
- if the Android command-line tools or SDK packages are missing, the CLI installs them automatically before building
- if no usable JDK is found, the CLI attempts to install a managed JDK 17 locally under `~/.mwa-webshell`

## Signing Flow

- `init` prompts for a signing keystore path and key alias
- `init` also captures Android version code and version name
- if the keystore file does not exist yet, `init` creates it and persists only the keystore path and alias into `twa-manifest.json`
- `build --release` uses that saved signing metadata
- passwords are never persisted
- password resolution order is:
  - `WEB_SHELL_KEYSTORE_PASSWORD` / `WEB_SHELL_KEY_PASSWORD`
  - hidden interactive prompts during `build`

## Development

```bash
npm install
npm run build
npm test
```
