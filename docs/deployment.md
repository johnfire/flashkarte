# Deployment

LearnWohl deploys to the VPS through GitHub Actions, GHCR, and SSH. A push to
`main` runs the test and security gates and builds the app and MCP images.
The workflow packages their image digests with the Compose files and checks
the bundle checksum on the VPS. It deploys that bundle to private staging,
runs the live browser gate, and then automatically deploys the same bundle
to production. The VPS pulls images. Production uses `/opt/learnwohl` and
the existing `learnwohl_learnwohl_pgdata` volume.

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

Private staging is `https://staging.learnwohl.app` on the same VPS. Apache
requires a staging TLS client certificate and uses loopback ports 8106 for
the app and 8107 for MCP. Its PostgreSQL volume, session keys, MCP OAuth
store, and logs belong to the `learnwohl-staging` Compose project. The
stage app and email worker deliver only to the private test inbox on loopback
port 8046. Live email tenants, billing, issue creation and signup alerts
are disabled in staging.

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
- `SIGNUP_NOTIFICATION_EMAIL` — signup alerts default to
  `chris@christopherrehm.de`. Set a different single email address to override,
  or explicitly set an empty value to disable. The app records the alert in the
  same database transaction as the new account/session; the email worker sends
  it as soon as available without waiting for verification, prioritizing alerts
  over bulk announcements. It contains the signup email,
  account ID, UTC signup time, and pending verification status, never passwords
  or tokens. SMTP failures do not block signup: the worker retries up to five
  times and preserves final failures in `email_deliveries`. An event key prevents
  duplicate enqueues; SMTP cannot guarantee exactly-once delivery after a crash.
  Both web and Android use this signup path. Existing accounts are not backfilled.
- `EMAIL_SERVICE_TENANTS` — optional JSON mapping of tenant slugs to strong
  bearer secrets and sender identities. The service derives the tenant from the
  credential; callers cannot choose an arbitrary tenant in a request. Configure
  `flashkarte`, `notes-world`, and `leguilde` here before enabling integrations.
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

`/opt/learnwohl` is already a Git checkout on the current VPS. Keep its
existing `.env`, database volume, and backup directory. The release job
uses the Compose files from the bundle and that directory as the Compose
project directory so the production paths still resolve correctly.
Migrations run automatically on app startup.

## Private staging and agent tests

- Set the DNS A record to the VPS, install the Apache challenge vhost in
  `deploy/apache/`, and issue the public server certificate. Install
  a dedicated staging client CA and enable the staging HTTPS vhost.
- Create `/opt/learnwohl-staging` with its own writable `logs` directory
  and create `/opt/learnwohl-releases` for the deployment user. Run
  `scripts/release/init-staging-env.sh /opt/learnwohl-staging/.env` on the VPS.
  It generates independent keys and refuses to overwrite an existing file.
- Give CI and each authorized workstation its own client certificate. Local
  agents can put the PEM credentials in `~/.local/share/learnwohl/staging-tls/`
  as `agent.pem` and `agent.key`, or set `STAGING_TLS_CERT_PATH` and
  `STAGING_TLS_KEY_PATH`.
- Run the following from the repository. The command authenticates with the
  certificate, opens the test inbox tunnel over SSH, and drives a disposable
  account through signup, verification, study, password change, 2FA, export,
  and deletion. The verification email must point back to staging. Staging
  raises the auth and 2FA rate limits to accommodate repeated test sign-ins.

```bash
npm run test:staging
```

## Contacting users

An administrator can open **Admin**, select verified users, enter a subject and
plain-text service message, confirm the recipient count, and choose **Queue
email**. The app writes the campaign and one delivery row per selected user in
one transaction. The worker claims those rows atomically, sends one message per
recipient, retries transient failures with bounded exponential backoff, and
records the final state in the database.

The shared backend API is available at `/api/service-email` for configured
product tenants. It supports recipient synchronization, transactional messages,
service announcements, product-update opt-in checks, tenant-scoped campaign
status, and the same queued worker/retry path. Product backends authenticate
with their tenant bearer secret; no product uses another product's users or
JWTs. The existing Flashkarte admin UI and account-mail paths remain compatible.

The shared API does not provide tracking pixels or cross-product audiences. A
product must synchronize its own recipients and preferences, and product-update
messages must target recipients explicitly opted in for that tenant.

After deployment, check the worker with:

```bash
docker compose -f docker-compose.prod.yml ps app worker db
docker compose -f docker-compose.prod.yml logs --tail=100 worker
```

## GitHub Actions secrets

Set these in the repo (Settings → Secrets and variables → Actions) so the
`deploy` job can reach the VPS:

| Secret             | Value                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `VPS_HOST`         | `82.165.32.162`                                                                                                  |
| `VPS_USER`         | `claude`                                                                                                         |
| `VPS_PORT`         | `22`                                                                                                             |
| `VPS_SSH_KEY`      | private key of a dedicated deploy keypair whose public key is in `claude@`'s `~/.ssh/authorized_keys` on the VPS |
| `VPS_HOST_KEY`     | Pinned VPS SSH host key in known_hosts format                                                                    |
| `STAGING_TLS_CERT` | PEM client certificate for the CI staging runner                                                                 |
| `STAGING_TLS_KEY`  | PEM client private key for the CI staging runner                                                                 |

`GITHUB_TOKEN` (used to push to GHCR) is provided automatically.

## Apache reverse proxy + TLS

The vhosts terminate TLS for `learnwohl.app` and `www.learnwohl.app`. Their
specific MCP paths must appear before the catch-all app proxy. The same routing
belongs in both HTTP and HTTPS vhosts. HTTP requests for either hostname must
go directly to the bare HTTPS address, and HTTPS `www` requests must take the
same single-hop redirect. This avoids letting the `www` address split canonical
signals before the app can redirect it.
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

    # One canonical public address; preserve the requested path and query.
    RewriteEngine on
    RewriteCond %{HTTP_HOST} ^(?:www\.)?learnwohl\.app(?::[0-9]+)?$ [NC]
    RewriteRule ^ https://learnwohl.app%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```

In the HTTPS vhost, keep the same `RewriteEngine` rule but use only the
`www.learnwohl.app` condition. It must redirect `www` to the bare host before
the request reaches the app, while the bare HTTPS host continues to proxy the
app and MCP routes normally.

The app image builds with `VITE_MCP_URL=/mcp`. Settings expands that path using the active site origin. The server reads `MCP_PUBLIC_URL` at runtime for `/llms.txt`.

## Rollback

Keep previous tested bundles and their registry digests available. GitHub
retains the release artifact for 30 days. On the VPS, the bundle digest
for each active stack is recorded in `/opt/learnwohl-releases/staging-current`
or `/opt/learnwohl-releases/production-current`.

To redeploy a tested registry bundle, check database migration compatibility,
then run the matching deploy script on the VPS with its bundle path and digest.
Set `release_digest` and `registry_user` for the selected bundle and supply a
GHCR read token on standard input. Verify production from the checkout
afterwards.

```bash
release="/opt/learnwohl-releases/${release_digest:?Choose a tested release digest}"
bash "$release-deploy.sh" production "$release.tgz" "$release_digest" "${registry_user:?Set your GHCR username}"
bash scripts/release/verify.sh production
```

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
