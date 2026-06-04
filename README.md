# flashkarte

**flashkarte** is a Markdown-based flashcard app with SM-2 spaced repetition.
Write decks as plain Markdown, sign up, and study them anywhere — progress is
synced to your account. AI assistants can create decks on your behalf through a
hosted MCP server, using your own AI account.

Deck format: `# Title`, `## Category`, then numbered bold fronts
(`**1. question**`) with the answer on the following lines.

## Architecture

A full stack sharing one Markdown parser + SM-2 implementation:

| Path                                 | Description                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [`packages/shared`](packages/shared) | Markdown parser + SM-2 algorithm (TypeScript), parity-tested                                       |
| [`packages/server`](packages/server) | REST API — Express + TypeScript + Postgres; JWT auth, decks, study, API keys, client-error logging |
| [`packages/web`](packages/web)       | Web app — React + Vite + Tailwind SPA                                                              |
| [`packages/mcp`](packages/mcp)       | Hosted MCP server — lets a user's AI create/manage decks via a personal API key                    |
| [`android/`](android/)               | Android app — Kotlin / Compose / Hilt, talks to the API                                            |
| [`python/`](python/)                 | Original desktop app — Python / tkinter (reference)                                                |

The `packages/*` workspaces are npm workspaces; `android/` and `python/` are
standalone. The web, server, and Android clients all speak the same API; the AI
compute for MCP runs on the user's own account, not the server's.

## Develop

```bash
npm ci
npm run build --workspace=packages/shared   # server/web import its dist for types
npm test                                     # all workspaces
```

The Android app builds with Gradle (`cd android && ./gradlew :app:assembleDebug`)
and points at the deployed API via `BuildConfig.API_BASE_URL`.

## Deploy

Docker Compose stack (app + MCP + Postgres + daily backups), served at
`flashkarte.christopherrehm.de`. See [`docs/deployment.md`](docs/deployment.md).

## History

This repo merges the previously separate `flashmd-android` (Kotlin) and
`flashmd-python` (tkinter) repositories, preserving the full commit history of
each under its package directory.

## Support

If you find this useful, a small donation helps keep projects like this going:
[Donate via PayPal](https://paypal.me/christopherrehm001)
