#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."

scratch_dir="$(mktemp -d)"
ssh_options=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10)
if [[ -n "${LEARNWOHL_DEPLOY_SSH_CONFIG:-}" ]]; then
  ssh_options+=(-F "$LEARNWOHL_DEPLOY_SSH_CONFIG")
  ssh_host=learnwohl-vps
else
  ssh_host=claude@82.165.32.162
fi
socket_path="$scratch_dir/ssh"

cleanup() {
  if [[ -S "$socket_path" ]]; then
    ssh "${ssh_options[@]}" -S "$socket_path" -O exit "$ssh_host" >/dev/null 2>&1 || true
  fi
  rm -rf -- "$scratch_dir"
}
trap cleanup EXIT

if [[ -n "${STAGING_TLS_CERT:-}${STAGING_TLS_KEY:-}" ]]; then
  export STAGING_TLS_CERT_PATH="$scratch_dir/client.pem" STAGING_TLS_KEY_PATH="$scratch_dir/client.key"
  printf '%s\n' "${STAGING_TLS_CERT:?Missing staging certificate}" > "$STAGING_TLS_CERT_PATH"
  printf '%s\n' "${STAGING_TLS_KEY:?Missing staging key}" > "$STAGING_TLS_KEY_PATH"
  unset STAGING_TLS_CERT STAGING_TLS_KEY
else
  credential_dir="${XDG_DATA_HOME:-$HOME/.local/share}/learnwohl/staging-tls"
  export STAGING_TLS_CERT_PATH="${STAGING_TLS_CERT_PATH:-$credential_dir/agent.pem}"
  export STAGING_TLS_KEY_PATH="${STAGING_TLS_KEY_PATH:-$credential_dir/agent.key}"
fi
if [[ ! -r "$STAGING_TLS_CERT_PATH" || ! -r "$STAGING_TLS_KEY_PATH" ]]; then
  echo "Supply a readable staging client certificate and key" >&2
  exit 1
fi
bash scripts/release/verify.sh staging

mail_port="$(node -e '
  const server = require("node:net").createServer();
  server.listen(0, "127.0.0.1", () => {
    console.log(server.address().port);
    server.close();
  });
')"
ssh "${ssh_options[@]}" -o ExitOnForwardFailure=yes -M -S "$socket_path" -fN \
  -L "127.0.0.1:$mail_port:127.0.0.1:8046" "$ssh_host"
export STAGING_MAIL_URL="http://127.0.0.1:$mail_port"
curl --fail --silent --show-error --retry 5 --max-time 10 "$STAGING_MAIL_URL/api/v1/info" >/dev/null

npx --no-install playwright test --config e2e/playwright.staging.config.ts "$@"
