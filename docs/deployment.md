# Deployment

LearnWohl deploys to the VPS via **GitHub Actions → GHCR → SSH**. On every push
to `main`, CI runs the test suite, builds the **app** and **mcp** Docker images,
and pushes them to the GitHub Container Registry. The deploy job SSHes to the
VPS and updates the stack in `/opt/learnwohl`. The VPS itself never builds — it
only pulls. `/opt/flashkarte` is retired and CI must not enter it.

The stack (defined in `docker-compose.prod.yml`) has an **app** container
(Express, serving the built web SPA + `/api`), a **worker** container for queued
email delivery, a **postgres** container, and a daily **db-backup** sidecar. The
**mcp** container serves AI clients on the same domain. Containers publish only
to `127.0.0.1`; the VPS's **Apache** front proxy terminates TLS and routes
requests by path.

| Public path on `learnwohl.app`             | → localhost | Container |
| ------------------------------------------ | ----------- | --------- |
| `/` and app routes                         | `8096`      | app       |
| `/mcp`, `/oauth/*`, `/.well-known/oauth-*` | `8097`      | mcp       |

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
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_SECURE`, and
  `MAIL_FROM` — authenticated SMTP submission settings. These values are passed
  to both the app and the email worker; never commit them or put them in a
  campaign record.
- `FLASHKARTE_LOG_PATH=/home/claude/logs/learnwohl` — the variable name remains
  for compatibility with the current Compose file.
- `APP_PORT=8096`
- `MCP_PORT=8097`, `MCP_BASE_URL=https://learnwohl.app`, and
  `MCP_PUBLIC_URL=https://learnwohl.app/mcp`
- `MCP_OAUTH_CLIENT_ID=learnwohl-app-mcp` and a fresh `MCP_JWT_SECRET` from
  `openssl rand -hex 32`. Existing clients must reconnect to the new endpoint.
- `COMPOSE_PROFILES=mcp` — include MCP in manual Compose commands.
- `COMPOSE_FILE=docker-compose.prod.yml` — use the production file for manual
  `docker compose` commands on a new VPS installation.
- `TZ` — `Europe/Berlin`

`/opt/learnwohl` is already a Git checkout on the current VPS. Its `.env`,
database volume, backup directory, and previous hand-built Compose file were
preserved during bootstrap. Do not replace its `.env` with `.env.example`.
Its `.env` currently has `COMPOSE_FILE=docker-compose.pre-git.yml`, so plain
`docker compose` commands use the preserved live configuration instead of the
repository's development `docker-compose.yml`. After a successful CI deploy and
health check, the deploy job changes that value to `docker-compose.prod.yml`.
CI always specifies `-f docker-compose.prod.yml` explicitly.

First deploy (subsequent ones are automatic via CI):

```bash
export IMAGE_TAG=latest
docker compose --profile mcp -f docker-compose.prod.yml pull app worker mcp db db-backup
docker compose --profile mcp -f docker-compose.prod.yml up -d app worker mcp db db-backup
curl http://127.0.0.1:8096/health        # -> {"status":"ok"}
curl http://127.0.0.1:8097/health        # -> ok
```

Migrations run automatically on app startup (idempotent).

## Contacting users

An administrator can open **Admin**, select verified users, enter a subject and
plain-text service message, confirm the recipient count, and choose **Queue
email**. The app writes the campaign and one delivery row per selected user in
one transaction. The worker claims those rows atomically, sends one message per
recipient, retries transient failures with bounded exponential backoff, and
records the final state in the database.

This first version is deliberately limited to service announcements. It does
not provide marketing campaigns, tracking pixels, unsubscribe preferences, or
cross-product tenants yet. It also does not replace the existing verification,
password-reset, or email-change mail paths.

After deployment, check the worker with:

```bash
docker compose -f docker-compose.prod.yml ps app worker db
docker compose -f docker-compose.prod.yml logs --tail=100 worker
```

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

The vhosts terminate TLS for `learnwohl.app` and `www.learnwohl.app`. Their
specific MCP paths must appear before the catch-all app proxy. The same routing
belongs in both HTTP and HTTPS vhosts; Certbot's HTTP redirect still sends
clients to HTTPS.
On the current VPS, `sites-enabled/learnwohl-le-ssl.conf` is a regular file,
not a symlink. Keep it and `sites-available/learnwohl-le-ssl.conf` synchronized;
the enabled file also contains the existing analytics injection rule.

`/etc/apache2/sites-available/learnwohl.conf`:

```apache
<VirtualHost *:80>
    ServerName learnwohl.app
    ServerAlias www.learnwohl.app
    ProxyPreserveHost On
    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass /.well-known/oauth-protected-resource http://127.0.0.1:8097/.well-known/oauth-protected-resource
    ProxyPassReverse /.well-known/oauth-protected-resource http://127.0.0.1:8097/.well-known/oauth-protected-resource
    ProxyPass /.well-known/oauth-authorization-server http://127.0.0.1:8097/.well-known/oauth-authorization-server
    ProxyPassReverse /.well-known/oauth-authorization-server http://127.0.0.1:8097/.well-known/oauth-authorization-server
    ProxyPass /oauth/ http://127.0.0.1:8097/oauth/
    ProxyPassReverse /oauth/ http://127.0.0.1:8097/oauth/
    ProxyPass /mcp http://127.0.0.1:8097/mcp
    ProxyPassReverse /mcp http://127.0.0.1:8097/mcp
    ProxyPass / http://localhost:8096/
    ProxyPassReverse / http://localhost:8096/
    ErrorLog /var/log/apache2/learnwohl/web-error.log
    CustomLog /var/log/apache2/learnwohl/web-access.log combined
</VirtualHost>
```

The app image build sets `VITE_MCP_URL=https://learnwohl.app/mcp` for Settings.
The server reads `MCP_PUBLIC_URL` at runtime for `/llms.txt`.

## Rollback

Each deploy pins images to a commit SHA. To roll back, on the VPS:

```bash
cd /opt/learnwohl
export IMAGE_TAG=<previous-sha>
docker compose --profile mcp -f docker-compose.prod.yml pull app worker mcp
docker compose --profile mcp -f docker-compose.prod.yml up -d app worker mcp db db-backup
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
