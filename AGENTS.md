# Repository Guidelines

## Project Structure & Module Organization

This is a multi-client flashcard platform. TypeScript npm workspaces live in
`packages/`: `shared/` contains the Markdown parser and SM-2 logic, `server/`
is the Express/Postgres API, `web/` is the React/Vite/Tailwind SPA, and `mcp/`
hosts the MCP service. `android/` is a standalone Kotlin/Compose client and
`python/` is the legacy tkinter reference app. Put end-to-end tests in `e2e/`,
server migrations in `packages/server/src/db/migrations/`, and current product
designs in `docs/specs/` or `docs/plans/`.

## Build, Test, and Development Commands

Run from the repository root:

```bash
npm ci                              # install locked workspace dependencies
npm run build --workspace=packages/shared
npm test                             # all workspace unit tests
npm run typecheck                    # TypeScript checks across workspaces
npm run lint                         # ESLint for TypeScript and TSX
npm run format:check                 # verify Prettier formatting
npm run test:e2e                     # Playwright browser flows
```

For focused work, use `npm test --workspace @flashkarte/web -- --run
src/path/to/test.tsx`. Start web development with `npm run dev --workspace
@flashkarte/web`; start the API with `npm run dev --workspace @flashkarte/server`.
Build Android with `cd android && ./gradlew :app:assembleDebug`.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, and Prettier; do not hand-format
against its output. Name React components in PascalCase (`LearnPage.tsx`), hooks
as `useThing.ts`, and tests beside their source as `Thing.test.tsx`. Keep domain
logic in the owning `packages/server/src/domains/<domain>/` module and share
parser or scheduling behavior through `packages/shared` rather than duplicating it.

## Testing Guidelines

Add a focused unit/component test for every behavior change. Use Jest for shared,
server, and MCP tests; use Vitest and Testing Library for web tests; use Playwright
for complete user flows. Add server integration coverage when API, migrations, or
Postgres behavior changes. Run the narrow test first, then relevant typecheck and
lint commands before committing.

## Commit & Pull Request Guidelines

Make small, independently verifiable commits on `main`. Recent history uses short,
imperative subjects such as `Add global content reference numbers`; use optional
scopes when useful, for example `feat(web): show course IDs`. Do not push without
the repository owner's approval. If an external review is requested, include a
clear summary, linked issue, commands run, and screenshots for visible UI changes.

## Security & Configuration

Never commit `.env` files, credentials, or production data. Deployment configuration
and required environment variables are documented in `docs/deployment.md`.
