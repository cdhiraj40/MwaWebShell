# V1 Template Release Checklist

Use this checklist before calling the Android template "ready".

## 1) Basic Template Configuration

- [ ] Update `gradle.properties`:
  - [ ] `WEB_SHELL_URL`
  - [ ] `WEB_SHELL_APPLICATION_ID`
  - [ ] `WEB_SHELL_USER_AGENT_SUFFIX`
  - [ ] `WEB_SHELL_DEBUG_URL_PRESETS`
- [ ] Update app display name in `app/src/main/res/values/strings.xml` (`app_name`).

## 2) Optional Full Package Rename (if required)

If the team needs a custom package beyond `com.solanamobile.webshell`:

- [ ] Rename Kotlin package declarations and source directories.
- [ ] Update `android.namespace` in `app/build.gradle.kts`.
- [ ] Keep `WEB_SHELL_APPLICATION_ID` aligned with desired release package.
- [ ] Verify imports/build still resolve (`BuildConfig`, theme imports, tests).

## 3) Build + Launch Verification

- [ ] `./gradlew installDebug`
- [ ] `adb shell am start -n <applicationId>/.MainActivity`
- [ ] App opens and target URL loads.

## 4) Core Functional Verification

- [ ] In-scope links stay in WebView.
- [ ] Out-of-scope links open external browser.
- [ ] Back navigation works as expected.
- [ ] MWA connect flow works.
- [ ] MWA sign flow works.

## 5) Debug Controls Verification

- [ ] Debug URL dropdown loads each preset correctly.
- [ ] `MWA: OFF` path works when manual injection is disabled.
- [ ] `MWA: ON` path still works.

## 6) Current 5-Site Matrix (baseline)

- [ ] `https://trepa.app/`
- [ ] `https://app.drift.trade/`
- [ ] `https://www.jito.network/staking/`
- [ ] `https://jup.ag/`
- [ ] `https://www.cfl.fun/`

## 7) Ship Readiness

- [ ] Remove/disable non-essential debug UI for release if needed.
- [ ] Confirm release build compiles.
- [ ] Record test results and known V2 deferrals.
