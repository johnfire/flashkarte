#!/usr/bin/env bash
set -euo pipefail

bundle="${1:?Supply an output path}"
app_ref="${2:?Supply the app image reference}"
mcp_ref="${3:?Supply the MCP image reference}"
mode="${4:-registry}"

validate_ref() {
  local service="$1" reference="$2"
  case "$mode" in
    registry) [[ "$reference" =~ ^ghcr\.io/johnfire/flashkarte-$service@sha256:[a-f0-9]{64}$ ]] ;;
    bootstrap) [[ "$reference" =~ ^ghcr\.io/johnfire/flashkarte-$service:bootstrap-[a-f0-9]+$ ]] ;;
    *) return 1 ;;
  esac
}
validate_ref app "$app_ref"
validate_ref mcp "$mcp_ref"

scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
cp docker-compose.prod.yml docker-compose.staging.yml "$scratch/"
cat > "$scratch/docker-compose.release.yml" <<COMPOSE
services:
  app:
    image: $app_ref
  worker:
    image: $app_ref
  mcp:
    image: $mcp_ref
COMPOSE
git rev-parse HEAD > "$scratch/commit"
printf '%s\n' "$mode" > "$scratch/mode"
tar -czf "$bundle" -C "$scratch" .
