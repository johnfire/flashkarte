#!/usr/bin/env bash
# FlashMD — Linux installer
# Creates a venv, installs the package, and adds a desktop launcher.
# Usage: bash install-linux.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

echo "==> Checking Python..."
python3 --version >/dev/null 2>&1 || { echo "Error: python3 not found."; exit 1; }

# Ensure tkinter is available
python3 -c "import tkinter" 2>/dev/null || {
  echo "tkinter not found. Install it with:"
  echo "  sudo apt install python3-tk   # Debian/Ubuntu"
  echo "  sudo dnf install python3-tkinter  # Fedora"
  exit 1
}

echo "==> Creating virtual environment..."
python3 -m venv "$VENV"

echo "==> Installing FlashMD..."
"$VENV/bin/pip" install --quiet -e "$SCRIPT_DIR"

echo "==> Installing desktop launcher..."
ICON_DIR="$HOME/.local/share/icons"
APP_DIR="$HOME/.local/share/applications"
mkdir -p "$ICON_DIR" "$APP_DIR"
cp "$SCRIPT_DIR/assets/flashmd.svg" "$ICON_DIR/flashmd.svg"

cat > "$APP_DIR/flashmd.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=FlashMD
Comment=Markdown flashcard app with SM-2 spaced repetition
Exec=$VENV/bin/flashmd
Icon=$ICON_DIR/flashmd.svg
Terminal=false
Categories=Education;Office;
StartupWMClass=flashmd
EOF

update-desktop-database "$APP_DIR" 2>/dev/null || true

echo ""
echo "Done! Run FlashMD with:"
echo "  $VENV/bin/flashmd"
echo "Or find it in your application menu."
