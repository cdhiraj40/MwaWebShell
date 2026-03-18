# Solana Mobile Web Shell

Android WebView shell for Solana dApps with working Mobile Wallet Adapter (MWA) flow.

## Current Focus

- Android WebView template: complete baseline
- CLI: working Node 24 + TypeScript tool under `cli/`
- Edge-case investigations (service workers, notifications, advanced browser parity): deferred

## Why

Upcoming Android browser Local Network Access permission behavior can break MWA flows for PWAs and custom-tab approaches.

This Android WebView shell is the immediate path to preserve wallet connect/sign functionality.

## Android Template Requirements (V1)

1. Host a web app at a configurable URL.
2. Support in-app navigation (back handling, normal WebView scroll/gesture behavior, pull-to-refresh).
3. Inject `Solana Mobile Web Shell` marker into the WebView user agent.
4. Catch and handle MWA intents (`solana-wallet://...`) and support connect/sign.
5. Open external browser for out-of-scope links (outside configured host).

## Implemented Template Capabilities

- WebView wrapper with configurable URL entrypoint.
- MWA intent interception and wallet-app handoff.
- Synthetic blur dispatch to unblock MWA detection in WebView.
- Stable JS runtime during wallet handoff (WebView JS not paused).
- Browser-like viewport behavior fixes + guarded runtime fallback for `vh/dvh`.
- External link routing for non-scoped hosts.
- Pull-to-refresh reload for in-app pages.

## Template Configuration

Update these values when creating a new app from this template:

1. `gradle.properties`
   - `WEB_SHELL_URL`: default site loaded by WebView.
   - `WEB_SHELL_APPLICATION_ID`: APK package id for install/release.
2. `app/src/main/res/values/strings.xml`
   - `app_name`: launcher app name.
3. Kotlin package/namespace (optional for V1, required for a full custom package)
   - Current neutral template package: `com.solanamobile.webshell`
   - See release checklist for full rename steps.

## Build and Run

```bash
./gradlew installDebug
adb shell am start -n com.solanamobile.webshell/.MainActivity
```

## V1 Acceptance Snapshot

- Template validated against current test set:
  - `https://trepa.app/`
  - `https://app.drift.trade/`
  - `https://www.jito.network/staking/`
  - `https://jup.ag/`
  - `https://www.cfl.fun/`
- Current status:
  - Page loading works across the 5-site matrix.
  - Privy connect flow works.
  - MWA connect/sign flows work.

## CLI

The repository includes a Node 24 + TypeScript CLI under `cli/`.

Current commands:

- `init`: clones the template repository, copies the Android template into a target directory, rewrites app name, application ID, Kotlin package / namespace, URL, icons, and splash branding
- `build`: runs Android toolchain checks, installs missing dependencies when needed, and builds the generated Android project
- `doctor`: checks Android/JDK toolchain state and can install missing dependencies

Supported manifest/config input:

- standard web `manifest.json`
- Bubblewrap-style `twa-manifest.json`

The CLI reuses compatible metadata fields, but it does **not** generate a TWA project. It always generates this WebView-based Android shell.

Typical local usage during development:

```bash
cd cli
pnpm install
pnpm cli -- init ./my-app --manifest https://example.com/manifest.json
pnpm cli -- build ./my-app
pnpm cli -- doctor ./my-app --fix
```

## Deliverables Status

- [x] Boilerplate Android WebView wrapper project with required features.
- [x] CLI tool (`init`, `build`, `doctor`, dependency setup)

## Deferred to V2

- Service worker behavior deep-dive and compatibility layer strategy.
- Web Notifications bridging strategy.
- Extended edge-case matrix and hardening.

## References

- [Bubblewrap CLI / PWA publishing](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa#4-publish-digital-asset-links)
- [Solana Mobile docs: PWAs](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa#pwas-on-the-dapp-store)
