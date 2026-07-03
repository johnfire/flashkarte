# 03 — Image support in cards (URL pass-through)

**Priority:** 3 — prerequisite for the medicine use case · **Effort:** ~2–3 days
**Scope:** shared parser + web + Android rendering. No uploads, no storage.

## Goal

`![alt](https://…)` in a card front or back renders as an image on web and Android.
ECGs, histology slides, architecture diagrams.

## Requirements

1. **Parser (TS + Kotlin + corpus):** image syntax survives parsing verbatim inside
   front/back/prompt text (verify it isn't mangled by paragraph joining — add corpus
   cases with an image alone on a line and inline with text). No new card fields; the
   markdown stays in the text.
2. **Rendering — strict rules:**
   - Only `https://` URLs render; anything else displays as literal text.
   - Web (`StudyPage`, deck preview, library preview): render `![alt](url)` → `<img>`
     with `alt`, `loading="lazy"`, `max-width: 100%`. **No general markdown-to-HTML
     engine** — a single regex→element transform for the image pattern only (no HTML
     injection surface; test with `"/><script>` in alt text).
   - Android: Coil (already-common Compose image lib — justify in PR per guardrails; if
     avoiding a new dependency is preferred, v1 may show a tappable "View image" link
     opening the browser — decide in PR, state the choice).
   - Broken/unreachable image: show alt text; never block reveal/rating (anti-fragility).
3. **MCP tool docs** (`packages/mcp/src/tools/decks.ts`): mention image syntax in
   `create_deck`/`add_cards` descriptions so AI authors use it.
4. Explicit non-goals: uploads, image hosting, audio/video, offline image caching
   (Android note: images need connectivity in v1 — acceptable; card text still works).

## Acceptance criteria

1. Card with an https image renders it on web and Android; http/data/file URL renders as
   plain text.
2. XSS attempt via alt text or URL renders inert (web test asserting no element other
   than `<img>` is created).
3. Broken URL: alt text shown, card still ratable.
4. Corpus: image cases parse identically TS/Kotlin; existing fixtures unchanged.

## Tests

Parser corpus (both ports); web component test (render, https-only, XSS, broken);
Android snapshot/unit per chosen approach.
