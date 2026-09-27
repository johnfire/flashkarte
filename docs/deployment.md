# Deployment

LearnWohl deploys to the VPS via **GitHub Actions → GHCR → SSH**. On every push
to `main`, CI runs the test suite, builds the **app** and **mcp** Docker images,
and pushes them to the GitHub Container Registry. The deploy job SSHes to the
VPS and updates the stack in `/opt/learnwohl`. The VPS itself never builds — it
only pulls. `/opt/flashkarte` is retired and CI must not enter it.

The stack (defined in `docker-compose.prod.yml`) has an **app** container
(Express, serving the built web SPA + `/api`), a **postgres** container, and a
daily **db-backup** sidecar. The **mcp** container is selected explicitly when
its new hostname is ready. Containers publish only to `127.0.0.1`; the VPS's
**Apache** front proxy terminates TLS and reverse-proxies the public hostnames.

| Public hostname  | → localhost | Container |
| ---------------- | ----------- | --------- |
| `learnwohl.app`  | `8096`      | app       |

> **Going live is a deliberate one-time setup** (DNS + VPS bootstrap + secrets +
> Apache vhosts + certbot). After that, deploys are automatic on push to `main`.

## Images

CI builds two images and tags each with `:latest` and `:<commit-sha>`. Their
registry names retain `flashkarte` until the code and package names are
separately migrated:

- `ghcr.io/johnfire/flashkarte-app` (Dockerfile target `production`)
- `ghcr.io/johnfire/flashkarte-mcp` (Dockerfile target `mcp`)

The workflow logs in to GHCR with its short-lived GitHub token before pulling.
Images contain no runtime secrets; those are injected from the VPS `.env`.

## One-time VPS bootstrap

```bash
ssh claude@82.165.32.162
sudo git clone https://github.com/johnfire/flashkarte.git /opt/learnwohl
sudo chown -R claude:claude /opt/learnwohl
cd /opt/learnwohl
cp .env.example .env && nano .env        # fill in the values below
```

`.env` (never committed):

- `POSTGRES_PASSWORD` — `openssl rand -hex 24`
- `POSTGRES_DB=learnwohl` and `POSTGRES_USER=learnwohl` — match the existing
  LearnWohl database. The Compose defaults are `flashkarte` for compatibility.
- `POSTGRES_VOLUME_NAME=learnwohl_learnwohl_pgdata` and
  `POSTGRES_VOLUME_EXTERNAL=true` — reuse the existing live database volume.
  For a genuinely new installation, choose a new volume name and set
  `POSTGRES_VOLUME_EXTERNAL=false` so Compose creates it.
- `JWT_SECRET` — `openssl rand -hex 32`
- `NGINX_HOST=learnwohl.app` (drives `CORS_ORIGIN`)
- `APP_URL=https://learnwohl.app`
- `FLASHKARTE_LOG_PATH=/home/claude/logs/learnwohl` — the variable name remains
  for compatibility with the current Compose file.
- `APP_PORT=8096`
- `TZ` — `Europe/Berlin`

`/opt/learnwohl` is already a Git checkout on the current VPS. Its `.env`,
database volume, backup directory, and previous hand-built Compose file were
preserved during bootstrap. Do not replace its `.env` with `.env.example`.

First deploy (subsequent ones are automatic via CI):

```bash
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull app db db-backup
docker compose -f docker-compose.prod.yml up -d app db db-backup
curl http://127.0.0.1:8096/health        # -> {"status":"ok"}
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

The app vhost terminates TLS for `learnwohl.app` and `www.learnwohl.app` and
proxies to loopback port `8096`. It is already enabled on the current VPS.

`/etc/apache2/sites-available/learnwohl.conf`:

```apache
<VirtualHost *:80>
    ServerName learnwohl.app
    ServerAlias www.learnwohl.app
    ProxyPreserveHost On
    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass / http://localhost:8096/
    ProxyPassReverse / http://localhost:8096/
    ErrorLog /var/log/apache2/learnwohl/web-error.log
    CustomLog /var/log/apache2/learnwohl/web-access.log combined
</VirtualHost>
```

MCP needs its own DNS name, Apache vhost, TLS certificate, port, and
`MCP_BASE_URL` before its profile is enabled. Once it is live, set
`MCP_PUBLIC_URL` in the app environment and wire `VITE_MCP_URL` into the web
image build so Settings can display it. Until then, the site does not advertise
an MCP URL.

## Rollback

Each deploy pins images to a commit SHA. To roll back, on the VPS:

```bash
cd /opt/learnwohl
export IMAGE_TAG=<previous-sha>
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d app db db-backup
```

The deploy job checks that the VPS checkout matches its GitHub commit, so an
older workflow run is not a rollback mechanism after `main` has advanced.

## Logs

The master log is JSON-lines at `${FLASHKARTE_LOG_PATH}/flashkarte.log` (the
filename remains from the earlier app name).
Unhandled server errors and all client-error reports (`POST /api/client-errors`
from web/Android) land here:

```bash
tail -f ~/logs/learnwohl/flashkarte.log
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
