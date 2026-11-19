#!/usr/bin/env bash
set -euo pipefail

case "${1:?Supply staging or production}" in
  staging)
    origin=https://staging.learnwohl.app
    tls=(--cert "${STAGING_TLS_CERT_PATH:?}" --key "${STAGING_TLS_KEY_PATH:?}")
    if curl --fail --silent --max-time 10 "$origin/health" >/dev/null; then
      echo "Staging must require a client certificate" >&2
      exit 1
    fi
    ;;
  production) origin=https://learnwohl.app; tls=() ;;
  *) exit 2 ;;
esac

get() { curl --silent --show-error --max-time 10 "${tls[@]}" "$@"; }

verify_release() {
  get --fail "$origin/health" | jq -e '.status == "ok"' >/dev/null || return 1
  get --fail "$origin/.well-known/oauth-authorization-server" |
    jq -e --arg origin "$origin" '.issuer == $origin and .token_endpoint == ($origin + "/oauth/token")' >/dev/null || return 1
  [[ "$(get --output /dev/null --write-out '%{http_code}' "$origin/mcp")" == 401 ]]
}

for attempt in $(seq 1 12); do
  if verify_release; then
    echo "$origin passed app health and MCP discovery checks"
    exit 0
  fi
  sleep 5
done
echo "$origin failed app health or MCP discovery checks" >&2
exit 1
