# Solana Mobile Web Shell

Android WebView shell for Solana dApps with working Mobile Wallet Adapter (MWA) flow.

## Current Focus (V1)

V1 is **Android app template only**.

- CLI work is deferred.
- Edge-case investigations (service workers, notifications, advanced browser parity) are deferred.

## Why

Upcoming Android browser Local Network Access permission behavior can break MWA flows for PWAs and custom-tab approaches.

This Android WebView shell is the immediate path to preserve wallet connect/sign functionality.

## Android Template Requirements (V1)

1. Host a web app at a configurable URL.
2. Support in-app navigation (back handling, normal WebView scroll/gesture behavior).
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

## Template Configuration

Update these values when creating a new app from this template:

1. `gradle.properties`
   - `WEB_SHELL_URL`: default site loaded by WebView.
   - `WEB_SHELL_APPLICATION_ID`: APK package id for install/release.
   - `WEB_SHELL_USER_AGENT_SUFFIX`: marker appended to user agent.
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

## Deliverables Status

- [x] Boilerplate Android WebView wrapper project with required V1 features.
- [ ] CLI tool (`init`, `build`, dependency setup) - deferred to V2.

## Deferred to V2

- CLI project generator and build automation.
- Service worker behavior deep-dive and compatibility layer strategy.
- Web Notifications bridging strategy.
- Extended edge-case matrix and hardening.

## References

- [Bubblewrap CLI / PWA publishing](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa#4-publish-digital-asset-links)
- [Solana Mobile docs: PWAs](https://docs.solanamobile.com/dapp-publishing/publishing-a-pwa#pwas-on-the-dapp-store)
