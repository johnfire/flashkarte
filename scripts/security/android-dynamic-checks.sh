#!/usr/bin/env bash
# Behavioral check against the installed APK on a booted emulator/device:
# launches the app and watches for crashes/fatal exceptions. Report-only by
# design — see android-security.yml.
#
# Unlike notes-world/engcrm-mobile, flashkarte's AndroidManifest.xml declares
# no custom URI scheme or App Link intent-filter on any activity — MainActivity
# only responds to the standard LAUNCHER intent. There is currently no
# externally-reachable deep-link surface to fuzz, so this script does a launch
# smoke test instead of scheme-based payload probing. If a deep link /
# App Link is ever added, extend this script with payload fuzzing the same way
# notes-world/engcrm-mobile's copies do.
#
# This also deliberately does NOT try to re-derive exported-component status
# from `dumpsys package` — see notes-world's copy of this script (or the
# 2026-08-04 commit history) for why that's unreliable. Exported-component
# detection is android-static-checks.mjs's job, reading Gradle's merged
# manifest where the real exported flag is stated explicitly.
set -uo pipefail

PACKAGE_NAME="${PACKAGE_NAME:-de.christopherrehm.flashkarte}"
OUT_PATH="${SECURITY_FINDINGS_OUT:-android-dynamic-findings.json}"

findings="[]"

add_finding() {
  local severity="$1" category="$2" title="$3" detail="$4"
  findings=$(jq -c --arg s "$severity" --arg c "$category" --arg t "$title" --arg d "$detail" \
    '. + [{severity:$s, category:$c, title:$t, detail:$d}]' <<<"$findings")
}

echo "== launch smoke test =="
adb logcat -c
adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 3

if ! adb shell pidof "$PACKAGE_NAME" >/dev/null 2>&1; then
  add_finding "critical" "MASVS-PLATFORM" \
    "App process not running after launch" \
    "adb shell pidof $PACKAGE_NAME returned nothing shortly after a monkey-triggered launch. Check logcat for the crash."
  echo "  NOT RUNNING"
else
  echo "  ok: $PACKAGE_NAME is running"
fi

if adb logcat -d -t 100 | grep -q "FATAL EXCEPTION.*$PACKAGE_NAME\|AndroidRuntime.*$PACKAGE_NAME"; then
  add_finding "high" "MASVS-PLATFORM" \
    "Fatal exception logged around launch" \
    "App survived but logged a fatal exception around launch time. Check logcat."
  echo "  LOGGED FATAL EXCEPTION"
fi

echo
echo "$findings" | jq '{check: "android-dynamic-checks", timestamp: now | todate, findings: .}' > "$OUT_PATH"
cat "$OUT_PATH"

# Report-only — this script always exits 0. Findings are surfaced, not gated.
exit 0
