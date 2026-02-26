# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MwaWebShell is an Android application built with Kotlin and Jetpack Compose (Material 3). It uses a single-activity architecture with Compose-based UI.

- **Package:** `com.solanamobile.webshell`
- **Min SDK:** 28 | **Target/Compile SDK:** 36
- **Kotlin:** 2.0.21 | **AGP:** 9.0.0 | **Gradle:** 9.1.0
- **Java compatibility:** Java 11

## Build Commands

```bash
./gradlew assembleDebug          # Build debug APK
./gradlew assembleRelease        # Build release APK
./gradlew test                   # Run unit tests (JVM)
./gradlew connectedAndroidTest   # Run instrumented tests (requires device/emulator)
./gradlew clean                  # Clean build outputs
```

Run a single unit test class:
```bash
./gradlew test --tests "com.solanamobile.webshell.ExampleUnitTest"
```

## Architecture

Single-activity app using Jetpack Compose:

```
MainActivity (ComponentActivity, edge-to-edge)
  └─ MwaWebShellTheme (dynamic colors on Android 12+, light/dark)
       └─ Scaffold → Greeting composable
```

- **Entry point:** `app/src/main/java/com/cdhiraj40/mwawebshell/MainActivity.kt`
- **Theme system:** `app/src/main/java/com/cdhiraj40/mwawebshell/ui/theme/` — `Theme.kt` (color schemes + dynamic color), `Color.kt`, `Type.kt`

## Dependency Management

Dependencies are centralized in `gradle/libs.versions.toml` (version catalog). Reference them in `app/build.gradle.kts` using `libs.<alias>` syntax.
