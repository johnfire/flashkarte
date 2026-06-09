# SEO (discoverability for public pages) — Design

**Date:** 2026-06-09
**Scope:** Web SPA + Express server. Make flashkarte's public surface indexable and shareable, and add crawlable public deck pages. Authenticated app routes (decks, study, settings, admin) stay non-indexed.

## Goal

flashkarte is a client-rendered Vite SPA served by Express in production. Crawlers currently get an empty `<div id="root">`, the marketing page lives at `/welcome` while `/` is an auth wall, and there are no meta/OG tags, robots.txt, or sitemap. This design makes the public pages rank and share well, and turns the public library into crawlable, keyword-rich deck pages — without introducing an SSR framework or headless browser.

Built in **two independently-shippable phases** sharing one rendering mechanism.

## Rendering mechanism (shared)

**Server (production only — Express serves the built SPA there):**

- On boot, read built `index.html` once into memory as a cached template.
- New `seo/` module:
  - `seo/meta.ts` — pure builders returning `{ title, description, canonical, og, jsonLd }`: `staticMeta(route, lang)` (home/explore/privacy/impressum) and `deckMeta(preview)` (Phase 2).
  - `seo/inject.ts` — pure `inject(template, { headTags, bodyHtml })`: splices meta/OG/JSON-LD before `</head>` and optional server-rendered content inside `<div id="root">…</div>`. The SPA's `createRoot().render()` clears `#root` on mount, so injected body is crawler-only and never conflicts with React. Fails safe: on any marker mismatch, serve the untouched template.
  - `seo/middleware.ts` — matches known public routes, builds meta (+ Phase-2 deck body), injects, sends 200. Unknown deck slug → 404 + `noindex`. Everything else falls through to the existing `app.get("*")` SPA catch-all unchanged.
- Wired into `createApp()` **before** the catch-all, inside the `NODE_ENV === "production"` block.

**Client (SPA navigations + JS-capable crawlers):**

- Hand-rolled `useDocumentHead({ title, description, ... })` hook (~30 lines): sets `document.title` and upserts meta tags in `useEffect`. No `react-helmet-async` dependency. Server handles first-paint SEO; this keeps meta correct on client navigation.

**Single source of truth for the domain:** a `SITE_ORIGIN` constant (server-side, env-overridable: `SITE_ORIGIN` env var, default `https://flashkarte.christopherrehm.de`) drives every absolute URL (canonical, OG, sitemap, robots). One-line change when the domain moves.

## Phase 1 — SEO foundation

**Head meta (all public routes), via `staticMeta`:** per-route `<title>`, `<meta name="description">`, absolute `<link rel="canonical">`, `og:title/description/image/url/type`, `twitter:card=summary_large_image`, `theme-color`. `<html lang>` stays `en` canonical (hreflang deferred — future).

**OG image:** committed `public/og.png` (1200×630), generated reproducibly from a small branded template (logo "fk", product name, tagline) via a script.

**JSON-LD:** `WebApplication` block on home (name, url, description, `applicationCategory: EducationalApplication`, `offers` price 0).

**Homepage fix:** `/` renders `LandingPage` when logged-out, `DeckListPage` when logged-in (small wrapper reading `useAuth`). `/welcome` 301-redirects to `/` (server) and client-redirects (SPA). Server `staticMeta("/")` = landing meta. Canonical entry point converges on `/`.

**robots.txt** (static `public/robots.txt`): `Allow: /`; `Disallow:` `/settings`, `/decks`, `/admin`, `/library`, `/study`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`; `Sitemap:` absolute URL.

**sitemap.xml** (dynamic `GET /sitemap.xml`): Phase 1 lists `/`, `/explore`, `/privacy`, `/impressum`. Dynamic so it stays correct as content grows.

## Phase 2 — Public deck pages

**Public read API** (unauthenticated, mounted before `app.use("/api", requireAuth)`):

- `GET /api/public/library` — reuses `library.service.list` (user-independent).
- `GET /api/public/library/:id/preview` — new `getPreview(id)`: deck meta + cards as **fronts only** (`{front, category}`), no backs. Existing authed `/api/library/:id` (with backs) stays for clone.

**Slugs:** derived, no schema change. `/d/:slug` where `slug = slugify(title) + "-" + deckId` (deck id is a UUID, regex-extracted from the tail for lookup). Non-canonical title-prefix → 301 to canonical (server + SPA). Stable across title edits, zero migration, keywords up front.

**Web pages:**

- `/explore` → `ExplorePage`: public browse (like `LibraryPage` but unauthenticated, public API; cards link to `/d/:slug`; "Clone" → signup/login prompt).
- `/d/:slug` → `PublicDeckPage`: title (h1), author, card count, **questions** listed; answers shown as a gated "Sign up free to study the answers" CTA. Uses `useDocumentHead`.

**Server SEO for `/d/:slug`:** `deckMeta(preview)` → title (`"{title} — flashcards by {author} | flashkarte"`), synthesized description (`"{N} flashcards. Includes: {q1}; {q2}; …"`), OG, `LearningResource` JSON-LD (name, author, `numberOfItems`, best-effort `inLanguage`). `inject` places a server-rendered question list in `#root`. Unknown/unpublished id → 404 + noindex.

**Sitemap:** also enumerates every public deck `/d/:slug` (from `library.service.list`). List pagination deferred (noted).

**Clone from public pages:** "Clone"/"Sign up to study" → `/login?mode=signup&next=/d/:slug`; after auth, return and clone via the existing authed endpoint.

## Testing

- **Pure units (server):** `slugify`/`extractDeckId`/canonical-slug; `staticMeta`/`deckMeta` output shape; `inject()` head+body splice and escaping of user content (titles/questions) against HTML / JSON-LD injection.
- **Server integration (supertest, production-mode app over a fixture index.html):** `/` and `/d/:slug` return injected meta + content; unknown slug → 404 + noindex; non-canonical slug → 301; `/sitemap.xml` lists expected URLs; `robots.txt` served; public API returns fronts-only (assert no `back` field).
- **Web:** `ExplorePage`/`PublicDeckPage` render from public API; answers absent from DOM for anonymous users; `useDocumentHead` sets title/meta; `/` logged-in vs logged-out branch.

## Risks / mitigations

- **Answer leakage** — preview API must never serve `back`; explicit test asserts absence.
- **Injection via user content** — all server-injected HTML and JSON-LD values escaped/JSON-encoded; explicit test.
- **Thin content** — 1-card decks are weak; acceptable; `noindex` below a small card threshold is a noted future tweak.
- **Template drift** — cached `index.html` read at boot; injection fails safe to the untouched template on marker mismatch; covered.
- **Domain move** — single `SITE_ORIGIN` constant/env.

## Out of scope

- SSR framework / headless-browser prerender.
- hreflang / localized public URLs (UI chrome is already i18n'd; deferred).
- Deck-page render caching (add LRU/TTL later if crawl volume warrants).
- Library list pagination.
- Localized OG images.

## Build order

1. **Phase 1 plan** — rendering layer + foundation (meta/OG/JSON-LD, robots, sitemap, homepage fix, OG image, client head hook). Ships working SEO for the marketing pages.
2. **Phase 2 plan** — public read API + `/explore` + `/d/:slug` + deck meta/JSON-LD + sitemap deck URLs. Stacks on Phase 1.
