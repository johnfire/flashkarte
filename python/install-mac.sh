#!/usr/bin/env bash
# FlashMD — macOS installer
# Creates a venv, installs the package, and builds a .app bundle in ~/Applications.
# Usage: bash install-mac.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"
APP_BUNDLE="$HOME/Applications/FlashMD.app"

echo "==> Checking Python..."
python3 --version >/dev/null 2>&1 || {
  echo "Error: python3 not found. Install from https://www.python.org or via Homebrew:"
  echo "  brew install python"
  exit 1
}

# Ensure tkinter is available (macOS python.org builds include it; Homebrew may not)
python3 -c "import tkinter" 2>/dev/null || {
  echo "tkinter not found. Install a python.org build or:"
  echo "  brew install python-tk"
  exit 1
}

echo "==> Creating virtual environment..."
python3 -m venv "$VENV"

echo "==> Installing FlashMD..."
"$VENV/bin/pip" install --quiet -e "$SCRIPT_DIR"

echo "==> Building FlashMD.app bundle..."
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# Launcher script
cat > "$APP_BUNDLE/Contents/MacOS/FlashMD" <<EOF
#!/usr/bin/env bash
exec "$VENV/bin/flashmd"
EOF
chmod +x "$APP_BUNDLE/Contents/MacOS/FlashMD"

# Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>FlashMD</string>
  <key>CFBundleDisplayName</key>
  <string>FlashMD</string>
  <key>CFBundleIdentifier</key>
  <string>com.flashmd.python</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundleExecutable</key>
  <string>FlashMD</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.14</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

# Copy SVG icon (macOS Finder won't show SVG as icon but the bundle still works)
cp "$SCRIPT_DIR/assets/flashmd.svg" "$APP_BUNDLE/Contents/Resources/flashmd.svg"

echo ""
echo "Done! Run FlashMD:"
echo "  Double-click FlashMD in ~/Applications"
echo "  Or from the terminal: open ~/Applications/FlashMD.app"
echo "  Or directly: $VENV/bin/flashmd"
