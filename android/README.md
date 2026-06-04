# flashmd-android

Android flashcard app that parses Markdown files into decks and studies them using SM-2 spaced repetition. Fully local, no backend.

## Requirements

- Android Studio Hedgehog or later
- Android SDK 26+
- JDK 17

## Build & Run

### Option 1: Android Studio (recommended)

1. Open Android Studio → **File → Open** → select the `flashmd-android/` folder
2. Android Studio will download Gradle and sync automatically (first run takes a few minutes)
3. Connect your device or start an emulator
4. Click **Run ▶**

### Option 2: Command line (ADB)

```bash
git clone https://github.com/johnfire/flashmd-android
cd flashmd-android

# Generate Gradle wrapper (requires Gradle 8.7 installed, or use Android Studio instead)
gradle wrapper

# Build debug APK
./gradlew assembleDebug

# Install on connected device
adb install app/build/outputs/apk/debug/app-debug.apk

# Or build + install in one step
./gradlew installDebug
```

## Deploying to a Physical Device

### USB (any Android version)

1. On your phone/tablet: **Settings → About Phone → tap Build Number 7 times** to enable Developer Options
2. **Settings → Developer Options → enable USB Debugging**
3. Connect via USB cable and tap **Trust** on the device prompt
4. In Android Studio, select your device from the dropdown and click **Run ▶**
   — or via command line: `./gradlew installDebug`

### Wireless (Android 11+, no cable needed)

1. On your device: **Settings → Developer Options → Wireless Debugging → enable**
2. Tap **"Pair device with pairing code"** and note the IP, port, and code
3. In Android Studio: **Run → Pair Devices Using Wi-Fi** → enter the pairing code
4. Once paired, deploy wirelessly any time you're on the same network

### Verify device is detected

```bash
adb devices
```

## Markdown Format

A single `.md` file = one deck. Cards follow this pattern:

```
# Deck Title

## Category Name

**1. TERM — Full Term Name**
Definition paragraph.

Second paragraph if needed.
```

## Running Unit Tests

```bash
./gradlew test
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Kotlin |
| UI | Jetpack Compose + Material3 |
| Database | Room (SQLite) |
| DI | Hilt |
| Navigation | Compose Navigation |
| Architecture | MVVM + Repository |
| Min SDK | 26 (Android 8) |

## License

MIT — Copyright (c) 2025 Christopher Rehm
