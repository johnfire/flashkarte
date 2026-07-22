# Deployment

flashkarte deploys to the VPS via **GitHub Actions → GHCR → SSH**. On every push
to `main`, CI runs the test suite, builds the **app** and **mcp** Docker images,
pushes them to the GitHub Container Registry, then SSHes to the VPS and restarts
the stack from the freshly-pulled images. The VPS itself never builds — it only
pulls.

The stack (defined in `docker-compose.prod.yml`) is: one **app** container
(Express, serves the built web SPA + `/api`), one **mcp** container (hosted MCP
server), a **postgres** container, and a daily **db-backup** sidecar. The app and
mcp publish only to `127.0.0.1` (`${APP_PORT:-8090}` / `${MCP_PORT:-8091}`); the
VPS's **Apache** front proxy terminates TLS and reverse-proxies the public
hostnames to them.

| Public hostname                     | → localhost | Container |
| ----------------------------------- | ----------- | --------- |
| `flashkarte.christopherrehm.de`     | `8090`      | app       |
| `mcp.flashkarte.christopherrehm.de` | `8091`      | mcp       |

> **Going live is a deliberate one-time setup** (DNS + VPS bootstrap + secrets +
> Apache vhosts + certbot). After that, deploys are automatic on push to `main`.

## Images

CI builds two images and tags each with `:latest` and `:<commit-sha>`:

- `ghcr.io/johnfire/flashkarte-app` (Dockerfile target `production`)
- `ghcr.io/johnfire/flashkarte-mcp` (Dockerfile target `mcp`)

Both packages are **public**, so the VPS pulls without authenticating. (They
contain no secrets — secrets are injected at runtime from `.env`.) After the
first CI build creates them, set each package's visibility to Public once in the
GitHub package settings.

## One-time VPS bootstrap

```bash
ssh claude@82.165.32.162
sudo git clone https://github.com/johnfire/flashkarte.git /opt/flashkarte
sudo chown -R claude:claude /opt/flashkarte
cd /opt/flashkarte
cp .env.example .env && nano .env        # fill in the values below
```

`.env` (never committed):

- `POSTGRES_PASSWORD` — `openssl rand -hex 24`
- `JWT_SECRET` — `openssl rand -hex 32`
- `NGINX_HOST` — `flashkarte.christopherrehm.de` (drives `CORS_ORIGIN`)
- `FLASHKARTE_LOG_PATH` — a host path under `~/logs/`, e.g. `/home/claude/logs/flashkarte`
- `APP_PORT` — `8090`
- `MCP_PORT` — `8091`
- `TZ` — `Europe/Berlin`

First deploy (subsequent ones are automatic via CI):

```bash
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl http://127.0.0.1:8090/health        # -> {"status":"ok"}
```

Migrations run automatically on app startup (idempotent).

## GitHub Actions secrets

Set these in the repo (Settings → Secrets and variables → Actions) so the
`deploy` job can reach the VPS:

| Secret        | Value                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `VPS_HOST`    | `82.165.32.162`                                                                                                  |
| `VPS_USER`    | `claude`                                                                                                         |
| `VPS_PORT`    | `22`                                                                                                             |
| `VPS_SSH_KEY` | private key of a dedicated deploy keypair whose public key is in `claude@`'s `~/.ssh/authorized_keys` on the VPS |

`GITHUB_TOKEN` (used to push to GHCR) is provided automatically.

## Apache reverse proxy + TLS

Two vhosts (same pattern as the other apps on this VPS), then certbot issues the
certs and rewrites them to `:443`.

`/etc/apache2/sites-available/flashkarte.conf`:

```apache
<VirtualHost *:80>
    ServerName flashkarte.christopherrehm.de
    ProxyPreserveHost On
    ProxyPass / http://localhost:8090/
    ProxyPassReverse / http://localhost:8090/
    ErrorLog ${APACHE_LOG_DIR}/flashkarte-error.log
    CustomLog ${APACHE_LOG_DIR}/flashkarte-access.log combined
</VirtualHost>
```

`/etc/apache2/sites-available/mcp.flashkarte.conf`:

```apache
<VirtualHost *:80>
    ServerName mcp.flashkarte.christopherrehm.de
    ProxyPreserveHost On
    ProxyPass / http://localhost:8091/
    ProxyPassReverse / http://localhost:8091/
    ErrorLog ${APACHE_LOG_DIR}/mcp-flashkarte-error.log
    CustomLog ${APACHE_LOG_DIR}/mcp-flashkarte-access.log combined
</VirtualHost>
```

```bash
sudo a2ensite flashkarte mcp.flashkarte
sudo apache2ctl configtest && sudo systemctl reload apache2
sudo certbot --apache \
  -d flashkarte.christopherrehm.de -d mcp.flashkarte.christopherrehm.de \
  --non-interactive --agree-tos -m christopher.rehm.63@protonmail.com
```

## Rollback

Each deploy pins images to a commit SHA. To roll back, on the VPS:

```bash
cd /opt/flashkarte
export IMAGE_TAG=<previous-sha>
docker compose -f docker-compose.prod.yml up -d
```

(Or re-run the GitHub Actions `deploy` job from an earlier green commit.)

## Logs

The master log is JSON-lines at `${FLASHKARTE_LOG_PATH}/flashkarte.log`.
Unhandled server errors and all client-error reports (`POST /api/client-errors`
from web/Android) land here:

```bash
tail -f ~/logs/flashkarte/flashkarte.log
```

The log contains structured request IDs. MCP tool logs forward the same
`x-request-id` to the backend, so investigate an AI action by searching that
ID in both service logs. `/metrics` requires an `Authorization: Bearer`
header matching `METRICS_TOKEN`; keep it behind the trusted reverse proxy.
Configure host `logrotate`
for the JSON-lines file before it reaches operationally significant size.

The self-hosted Postfix delivery and error logs use a dedicated daily logrotate
policy with a 90-day maximum retention. This is separate from the application
JSON log, which requires its own retention policy.

## Backups

The `db-backup` sidecar dumps the database daily to `./backups` (7 daily / 4
weekly / 3 monthly retained).
