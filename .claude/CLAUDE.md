# flashkarte — working with Chris

The build/ship workflow (commit after each task → ask "another task?" → push
everything on "no") is in Chris's global `~/.claude/CLAUDE.md` and applies here
like everywhere else. What follows is specific to this repo.

## Deployment architecture (don't confuse these)

- **Production** is a separate VPS (`flashkarte.christopherrehm.de`), fully
  automated: push to `main` → GitHub Actions builds/tests → pushes images to
  GHCR → SSHes to the VPS → restarts the stack. See `docs/deployment.md` for the
  full pipeline, rollback, and log locations.
- This dev machine also runs a **local backend on `:3001`** (`packages/server`,
  against a local `flashkarte-repro-pg` Postgres) — this is a separate local
  instance, **not** connected to production in any way. It has no static frontend
  mounted by default (`NODE_ENV` isn't set, so `express.static` for the web
  build never mounts — hitting `:3001/` directly returns "Cannot GET /").
- If something looks wrong on the live site, check whether the fix was actually
  **pushed and deployed** before debugging the local instance — they are
  independent, and local changes never reach production without a push.
- Before pushing, run `npm run format:check` — CI's format-check step will fail
  the whole pipeline (including deploy) on files that weren't run through
  prettier, and that's caught the same way it will catch it locally.
