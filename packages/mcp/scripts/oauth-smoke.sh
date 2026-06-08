#!/usr/bin/env bash
# Walks the full OAuth dance against a running MCP + backend, then creates a deck.
# Usage: BASE=http://localhost:3002 CLIENT=claude-ai EMAIL=you@x.com PASS=pw ./oauth-smoke.sh
set -euo pipefail

BASE="${BASE:?set BASE to the MCP base URL}"
CLIENT="${CLIENT:?set CLIENT to MCP_OAUTH_CLIENT_ID}"
EMAIL="${EMAIL:?set EMAIL}"
PASS="${PASS:?set PASS}"
REDIRECT="https://claude.ai/cb"

# PKCE pair
VERIFIER=$(openssl rand -hex 32)
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -binary -sha256 | openssl base64 -A | tr '+/' '-_' | tr -d '=')

# 1) authorize POST -> 302 with ?code=
CODE=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST "$BASE/oauth/authorize" \
  --data-urlencode "response_type=code" \
  --data-urlencode "client_id=$CLIENT" \
  --data-urlencode "redirect_uri=$REDIRECT" \
  --data-urlencode "code_challenge=$CHALLENGE" \
  --data-urlencode "code_challenge_method=S256" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASS" \
  | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')
echo "auth code: ${CODE:0:8}…"

# 2) token exchange
ACCESS=$(curl -s -X POST "$BASE/oauth/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=$CODE" \
  --data-urlencode "code_verifier=$VERIFIER" \
  --data-urlencode "client_id=$CLIENT" \
  --data-urlencode "redirect_uri=$REDIRECT" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
echo "access token acquired: ${ACCESS:+yes}"

# 3) call create_deck via the MCP endpoint
curl -s -X POST "$BASE/mcp" \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_deck","arguments":{"markdown":"# Smoke Test\n**1. ping?**\npong"}}}'
echo
echo "Done — check the account for a 'Smoke Test' deck."
