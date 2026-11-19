#!/usr/bin/env bash
set -euo pipefail
umask 077
set -o noclobber

cat > "${1:?Supply the staging env path}" <<ENV
NGINX_HOST=staging.learnwohl.app
APP_URL=https://staging.learnwohl.app
APP_PORT=8106
MCP_PORT=8107
MCP_BASE_URL=https://staging.learnwohl.app
MCP_PUBLIC_URL=https://staging.learnwohl.app/mcp
MCP_OAUTH_CLIENT_ID=learnwohl-staging-mcp
MCP_JWT_SECRET=$(openssl rand -hex 48)
POSTGRES_DB=learnwohl_staging
POSTGRES_USER=learnwohl_staging
POSTGRES_VOLUME_NAME=learnwohl-staging-pgdata
POSTGRES_VOLUME_EXTERNAL=false
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 48)
TWO_FACTOR_SECRET_KEY=$(openssl rand -base64 32)
FLASHKARTE_LOG_PATH=/opt/learnwohl-staging/logs
COMPOSE_PROFILES=mcp
ENV
