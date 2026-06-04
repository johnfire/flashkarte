#!/usr/bin/env bash
# Installs FlashMD as a desktop app (app menu + desktop shortcut).
# Run after: pip install -e .

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_BIN="$SCRIPT_DIR/.venv/bin/flashmd"

if [ ! -f "$VENV_BIN" ]; then
  echo "Error: $VENV_BIN not found. Run 'pip install -e .' first."
  exit 1
fi

ICON_DIR="$HOME/.local/share/icons"
APP_DIR="$HOME/.local/share/applications"
ICON_PATH="$ICON_DIR/flashmd.svg"
DESKTOP_PATH="$APP_DIR/flashmd.desktop"

mkdir -p "$ICON_DIR" "$APP_DIR"
cp "$SCRIPT_DIR/assets/flashmd.svg" "$ICON_PATH"

cat > "$DESKTOP_PATH" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=FlashMD
Comment=Markdown flashcard app with SM-2 spaced repetition
Exec=$VENV_BIN
Icon=$ICON_PATH
Terminal=false
Categories=Education;Office;
StartupWMClass=flashmd
EOF

update-desktop-database "$APP_DIR" 2>/dev/null || true

echo "Installed. FlashMD should now appear in your app menu."
echo "To add a desktop shortcut, copy $DESKTOP_PATH to ~/Desktop/"
