#!/usr/bin/env bash
# Import lesson JSON files into a flashkarte subject, using the AI authoring key kept in the keyring
# (see docs/course-authoring-guide.md: Settings -> AI authoring key, then store it once with
#   wl-paste -n | with-secret set flashkarte-ai --stdin --force ).
#
#   packages/mcp/scripts/import-lessons.sh <subject-uuid> lesson-a.json [lesson-b.json ...]
#
# Files are imported in the order given, so list prerequisite lessons first.
# FLASHKARTE_API_URL defaults to production; set it to http://localhost:3001 for a local server.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $(basename "$0") <subject-uuid> <lesson.json>..." >&2
  exit 1
fi
subject="$1"
shift

# Resolve the files before changing directory, so paths mean what the caller typed.
files=()
for file in "$@"; do
  files+=("$(realpath "$file")")
done

cd "$(dirname "$0")/.."
npm run build --silent

exec with-secret run flashkarte-ai FLASHKARTE_API_KEY -- \
  env FLASHKARTE_API_URL="${FLASHKARTE_API_URL:-https://flashkarte.christopherrehm.de}" \
  node dist/cli/import-lessons.js --subject "$subject" "${files[@]}"
