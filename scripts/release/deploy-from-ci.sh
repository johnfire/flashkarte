#!/usr/bin/env bash
set -euo pipefail

case "${1:?Supply staging or production}" in
  staging|production) target="$1" ;;
  *) exit 2 ;;
esac
[[ "${LEARNWOHL_RELEASE_DIGEST:?}" =~ ^[a-f0-9]{64}$ ]]
[[ "${GITHUB_ACTOR:?}" =~ ^[[:alnum:]][[:alnum:]_-]*(\[bot\])?$ ]]
release="/opt/learnwohl-releases/$LEARNWOHL_RELEASE_DIGEST"
printf '%s' "${GHCR_TOKEN:?}" |
  ssh -F ~/.ssh/learnwohl-deploy-config learnwohl-vps \
    "bash '$release-deploy.sh' '$target' '$release.tgz' '$LEARNWOHL_RELEASE_DIGEST' '$GITHUB_ACTOR'"
