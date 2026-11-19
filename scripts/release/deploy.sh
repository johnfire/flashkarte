#!/usr/bin/env bash
set -euo pipefail

target="${1:?Supply staging or production}"
bundle="${2:?Supply the release bundle}"
digest="${3:?Supply the expected SHA-256}"
registry_user="${4:-}"
[[ "$digest" =~ ^[a-f0-9]{64}$ ]]
printf '%s  %s\n' "$digest" "$bundle" | sha256sum --check

case "$target" in
  staging) project=learnwohl-staging; host=staging.learnwohl.app; app_port=8106; mcp_port=8107 ;;
  production) project=learnwohl; host=learnwohl.app; app_port=8096; mcp_port=8097 ;;
  *) echo "Unknown deployment target" >&2; exit 2 ;;
esac
case "$target:$(tar -xOzf "$bundle" ./mode)" in
  staging:bootstrap) ;;
  staging:registry|production:registry) : "${registry_user:?The registry bundle requires credentials}" ;;
  *) echo "Invalid bundle for $target" >&2; exit 2 ;;
esac

instance="/opt/$project"
env_file="$instance/.env"
require_env() { grep -Fxq "$1" "$env_file"; }
require_env "NGINX_HOST=$host"
require_env "APP_PORT=$app_port"
require_env "MCP_PORT=$mcp_port"
require_env "MCP_BASE_URL=https://$host"
require_env "MCP_PUBLIC_URL=https://$host/mcp"
require_env "COMPOSE_PROFILES=mcp"
grep -Eq '^MCP_JWT_SECRET=.{32,}$' "$env_file"

if [[ "$target" == production ]]; then
  require_env "POSTGRES_DB=learnwohl"
  require_env "POSTGRES_USER=learnwohl"
  require_env "POSTGRES_VOLUME_NAME=learnwohl_learnwohl_pgdata"
  require_env "POSTGRES_VOLUME_EXTERNAL=true"
  require_env "COMPOSE_FILE=docker-compose.prod.yml"
  require_env "MCP_OAUTH_CLIENT_ID=learnwohl-app-mcp"
  docker volume inspect learnwohl_learnwohl_pgdata >/dev/null
else
  require_env "POSTGRES_DB=learnwohl_staging"
  require_env "POSTGRES_USER=learnwohl_staging"
  require_env "POSTGRES_VOLUME_NAME=learnwohl-staging-pgdata"
  require_env "POSTGRES_VOLUME_EXTERNAL=false"
fi

release_root=/opt/learnwohl-releases
release_dir="$release_root/$digest"
exec 9>"$release_root/deploy.lock"
flock -w 180 9
if [[ ! -d "$release_dir" ]]; then
  unpacked="$(mktemp -d "$release_root/unpack.XXXXXXXX")"
  tar -xzf "$bundle" -C "$unpacked"
  mv "$unpacked" "$release_dir"
fi
echo "Deploying $(cat "$release_dir/commit") to $target"

files=(-f "$release_dir/docker-compose.prod.yml")
services=(app worker mcp db)
if [[ "$target" == staging ]]; then
  files+=(-f "$release_dir/docker-compose.staging.yml")
  services+=(test-mail)
else
  services+=(db-backup)
fi
files+=(-f "$release_dir/docker-compose.release.yml")

compose() {
  docker compose --project-directory "$instance" --project-name "$project" \
    --env-file "$env_file" --profile mcp "${files[@]}" "$@"
}

export DOCKER_CONFIG
DOCKER_CONFIG="$(mktemp -d)"
trap 'rm -rf -- "$DOCKER_CONFIG"' EXIT
if [[ -n "$registry_user" ]]; then
  docker login ghcr.io --username "$registry_user" --password-stdin
  compose pull "${services[@]}"
fi
if ! compose up -d --no-build --pull never --wait --wait-timeout 240 "${services[@]}"; then
  compose ps
  exit 1
fi
[[ "$(compose ps --services --filter status=running worker)" == worker ]]
printf '%s\n' "$digest" > "$release_root/$target-current.new"
mv -f "$release_root/$target-current.new" "$release_root/$target-current"
