# flashkarte Phase 1D — Docker + CI Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Make flashkarte deployable: a multi-stage Docker image (builds shared+server+web, the server serves the web build + API), a `docker-compose.yml` (app + postgres + db-backup), a CI workflow (test + build on every push), env template, and deploy docs for `flashkarte.christopherrehm.de`.

**Architecture:** Single app container runs the Express server, which serves the built web SPA as static files and the `/api` routes (mirrors notes-world). Postgres in its own container with a daily backup sidecar. The VPS's existing reverse proxy (Apache/nginx) terminates TLS and forwards the domain to the app's published port. **Going live (DNS + VPS) is a manual, user-greenlit step.**

**Tech Stack:** Docker multi-stage (node:20), docker-compose, GitHub Actions.

> **Spec:** `…specs/2026-06-04-flashkarte-phase1-mvp-design.md` §11. **Series:** 1A ✅ → 1B ✅ → 1C ✅ → 1D (this).

---

### Task 1: Serve the web build from the server in production

- [ ] **Step 1:** In `packages/server/src/app.ts`, after the API routers and before `errorHandler`, add production static serving of the web build with SPA fallback:

```ts
if (process.env.NODE_ENV === "production") {
  const webDist = path.join(__dirname, "..", "public");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}
```

Add `import path from "path";` at the top. (The Dockerfile copies `web/dist` → `server/public`.)

- [ ] **Step 2:** Run `npm test --workspace=packages/server` (still green — static block is skipped under test). Commit: `feat(server): serve web build in production`.

---

### Task 2: Dockerfile + .dockerignore

- [ ] **Step 1:** Create `Dockerfile` (multi-stage):

```dockerfile
# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/web packages/web
RUN npm run build --workspace=packages/shared \
 && npm run build --workspace=packages/server \
 && npm run build --workspace=packages/web

# ---- production deps ----
FROM node:20-bookworm-slim AS proddeps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci --omit=dev --workspace=packages/server

# ---- runtime ----
FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./node_modules/@flashkarte/shared/dist
COPY --from=build /app/packages/shared/package.json ./node_modules/@flashkarte/shared/package.json
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/web/dist ./packages/server/public
WORKDIR /app/packages/server
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

- [ ] **Step 2:** Create `.dockerignore`:

```
**/node_modules
**/dist
.git
android
python
docs
*.md
```

- [ ] **Step 3:** Build the image locally: `docker build -t flashkarte:test .`. Expected: builds with no error.

- [ ] **Step 4:** Commit: `feat(deploy): multi-stage Dockerfile + dockerignore`.

---

### Task 3: docker-compose + env template

- [ ] **Step 1:** Create `.env.example`:

```
POSTGRES_PASSWORD=change-me
JWT_SECRET=change-me-to-a-long-random-string
NGINX_HOST=flashkarte.christopherrehm.de
FLASHKARTE_LOG_PATH=./logs
APP_PORT=8090
```

- [ ] **Step 2:** Create `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3001
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - POSTGRES_DB=flashkarte
      - POSTGRES_USER=flashkarte
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=https://${NGINX_HOST}
      - LOG_DIR=/logs
    ports:
      - "127.0.0.1:${APP_PORT:-8090}:3001"
    volumes:
      - ${FLASHKARTE_LOG_PATH:-./logs}:/logs
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=flashkarte
      - POSTGRES_USER=flashkarte
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - flashkarte_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flashkarte"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  db-backup:
    image: prodrigestivill/postgres-backup-local:16-alpine
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - POSTGRES_DB=flashkarte
      - POSTGRES_USER=flashkarte
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_EXTRA_OPTS=--clean --if-exists
      - SCHEDULE=@daily
      - BACKUP_KEEP_DAYS=7
      - BACKUP_KEEP_WEEKS=4
      - BACKUP_KEEP_MONTHS=3
      - TZ=${TZ:-UTC}
    volumes:
      - ./backups:/backups
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  flashkarte_pgdata:
```

The app publishes only to `127.0.0.1:${APP_PORT}`; the VPS reverse proxy maps `https://flashkarte.christopherrehm.de` → that port (matches the notes-world topology — app serves both the SPA and `/api`, so no separate nginx container is needed).

- [ ] **Step 3:** Smoke test the full stack: `cp .env.example .env`, set a real password, `docker compose up -d --build`, wait for health, `curl http://127.0.0.1:8090/health` → `{"status":"ok"}`, then `curl -X POST .../api/client-errors` → 202. Tear down `docker compose down -v`.

- [ ] **Step 4:** Commit: `feat(deploy): docker-compose (app+db+backup) + env template`.

---

### Task 4: CI workflow (test + build gate)

- [ ] **Step 1:** Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build --workspace=packages/shared
      - run: npm test
      - run: npm run build --workspace=packages/server
      - run: npm run build --workspace=packages/web
```

`npm test` runs all three workspace suites; shared is built first because server/web import its dist for types.

- [ ] **Step 2:** Commit + push. Verify the run goes green on GitHub.

---

### Task 5: Deploy docs

- [ ] **Step 1:** Create `docs/deployment.md` documenting: DNS A record for `flashkarte.christopherrehm.de` → VPS, reverse-proxy vhost → `127.0.0.1:8090`, `.env` setup on the VPS (real `JWT_SECRET`, `POSTGRES_PASSWORD`, `FLASHKARTE_LOG_PATH` under `~/logs/`), `docker compose up -d --build`, certbot for TLS. Mark the live deploy as a **manual, user-performed** step.

- [ ] **Step 2:** Commit: `docs: deployment guide`.

---

## Self-Review Notes

- **Spec coverage:** §11 — Dockerized app (serves SPA + API), Postgres + daily backup, `LOG_DIR` master-log volume, `flashkarte.christopherrehm.de`, CI test+build gate. Going live is explicitly a user-greenlit manual step (touches live infra + DNS).
- **Consistency:** env names match the server (`POSTGRES_*`, `JWT_SECRET`, `CORS_ORIGIN`, `LOG_DIR`); app serves `public/` which the Dockerfile fills from `web/dist`; port 3001 internal, published to `127.0.0.1:8090`.
- **Deferred:** automated VPS deploy job (needs SSH secrets the user provisions) — CI covers test+build now; deploy is documented for the user to wire up.
