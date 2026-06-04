# Deployment

flashkarte deploys as a Docker Compose stack: one **app** container (Express,
serves the built web SPA + the `/api` routes), an **mcp** container (the hosted
MCP server for users' AI clients), a **postgres** container, and a daily
**db-backup** sidecar. The app and mcp publish only to `127.0.0.1` (`${APP_PORT}`
and `${MCP_PORT}`); the VPS's reverse proxy terminates TLS and forwards
`flashkarte.christopherrehm.de` → app and the MCP endpoint → mcp.

> **Going live is a manual step.** It touches live infra (DNS + VPS) and should
> be performed deliberately by the maintainer.

## One-time setup

1. **DNS** — add an `A` record for `flashkarte.christopherrehm.de` → the VPS IP.
2. **Clone** the repo on the VPS.
3. **Env** — copy and fill `.env` (never commit it):

   ```bash
   cp .env.example .env
   ```

   - `POSTGRES_PASSWORD` — a strong random value.
   - `JWT_SECRET` — a long random string (e.g. `openssl rand -hex 32`).
   - `NGINX_HOST` — `flashkarte.christopherrehm.de`.
   - `FLASHKARTE_LOG_PATH` — a host path under `~/logs/` so the master log
     (`flashkarte.log`) survives container restarts, e.g. `/home/<user>/logs/flashkarte`.
   - `APP_PORT` — the localhost port the reverse proxy targets (default `8090`).

## Deploy / update

```bash
docker compose up -d --build
```

Migrations run automatically on app startup (idempotent). Verify:

```bash
curl http://127.0.0.1:8090/health        # -> {"status":"ok"}
```

## Reverse proxy + TLS

Point a vhost for `flashkarte.christopherrehm.de` at `http://127.0.0.1:8090`
(same pattern as the other apps on the VPS), then issue a certificate with
certbot. The app sets `CORS_ORIGIN=https://flashkarte.christopherrehm.de` from
`NGINX_HOST`.

### MCP server

The hosted MCP server publishes to `127.0.0.1:${MCP_PORT}` (default `8091`).
Expose it at a stable URL — either a subdomain (`mcp.flashkarte.christopherrehm.de`)
or a path the reverse proxy maps to `http://127.0.0.1:8091/mcp`. Users add that
URL plus a personal API key (generated at `/settings` in the web app) to their AI
client (e.g. Claude Desktop). Their AI then calls the MCP tools
(`create_deck`, `add_cards`, `list_decks`, `get_deck`, `delete_deck`), which act
on that user's account — the AI compute runs on the user's own account, not ours.

## Logs

The master log is JSON-lines at `${FLASHKARTE_LOG_PATH}/flashkarte.log` on the
host. Unhandled server errors and all client-error reports
(`POST /api/client-errors` from web/Android) land here. Tail it to debug:

```bash
tail -f ~/logs/flashkarte/flashkarte.log
```

## Backups

The `db-backup` sidecar dumps the database daily to `./backups` (7 daily / 4
weekly / 3 monthly retained).

## CI

`.github/workflows/ci.yml` runs the full test suite + builds on every push and
PR to `main`. An automated VPS deploy job (SSH) can be added later once deploy
secrets are provisioned; until then, deploy is the manual `docker compose` step
above.
