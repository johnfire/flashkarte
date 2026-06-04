# FlashMD

A local, offline flashcard app that parses Markdown files into decks and studies them using SM-2 spaced repetition.

---

## Install

### Linux

```bash
git clone https://github.com/johnfire/flashmd-python
cd flashmd-python
bash install-linux.sh
```

Installs a virtual environment, the app, and a desktop launcher (shows up in your app menu).

> **Requires tkinter.** If the installer reports it missing:
> - Debian/Ubuntu: `sudo apt install python3-tk`
> - Fedora: `sudo dnf install python3-tkinter`

---

### macOS

```bash
git clone https://github.com/johnfire/flashmd-python
cd flashmd-python
bash install-mac.sh
```

Installs a virtual environment and creates `~/Applications/FlashMD.app`. Double-click it to launch, or drag it to your Dock.

> **Requires Python 3.10+.** Download from [python.org](https://www.python.org) or `brew install python`.
> If tkinter is missing: `brew install python-tk`

---

### Windows

1. Install [Python 3.10+](https://www.python.org) — check **"Add Python to PATH"** during setup
2. Clone or [download the ZIP](https://github.com/johnfire/flashmd-python/archive/refs/heads/main.zip) and unzip
3. Double-click **`install-windows.bat`**

Creates a virtual environment and adds **FlashMD** shortcuts to your Desktop and Start Menu.

---

### Android

> The Android app lives in a separate repo: [flashmd-android](https://github.com/johnfire/flashmd-android)

**Requirements:** Android Studio Hedgehog or later, Android SDK 26+, JDK 17

#### Install via Android Studio (recommended)

1. Clone `https://github.com/johnfire/flashmd-android`
2. Open Android Studio → **File → Open** → select the `flashmd-android/` folder
3. Android Studio downloads Gradle and syncs automatically (first run takes a few minutes)
4. Connect your device or start an emulator, then click **Run ▶**

#### Install via command line

```bash
git clone https://github.com/johnfire/flashmd-android
cd flashmd-android
./gradlew installDebug   # builds and installs on a connected device
```

#### Enable your device for USB sideloading

1. **Settings → About Phone → tap Build Number 7 times** to unlock Developer Options
2. **Settings → Developer Options → enable USB Debugging**
3. Connect via USB and tap **Trust** on the device prompt

#### Wireless deployment (Android 11+, no cable)

1. **Settings → Developer Options → Wireless Debugging → enable**
2. Tap **"Pair device with pairing code"** — note the IP, port, and code
3. In Android Studio: **Run → Pair Devices Using Wi-Fi** → enter the pairing code

---

## Markdown Format

A single `.md` file = one deck. Cards follow this pattern:

```
# Deck Title

## Category Name

**1. TERM — Full Term Name**
Definition paragraph.

Second paragraph if needed.
```

---

## Running from the terminal (all platforms)

```bash
# Linux / macOS
.venv/bin/flashmd

# Windows
.venv\Scripts\flashmd.exe
```

---

## Running Tests

```bash
pip install pytest
pytest
```

---

## Support

If FlashMD is useful to you and you'd like to help keep projects like this going, a small donation is always appreciated:

[Donate via PayPal](https://paypal.me/christopherrehm001)

---

## License

MIT — Copyright (c) 2025 Christopher Rehm
