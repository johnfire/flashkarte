# In-app User Guide page — Design

_Date: 2026-06-10 · Scope: `packages/web` (+ sitemap in `packages/server`)_

## Goal

Give users a single, scannable in-app page that explains how to use flashkarte —
above all **how to design card decks** — covering the Markdown deck format, deck
settings, studying, sharing, and connecting an AI assistant. Style: a concise
cheat-sheet that still covers the whole app, not a verbose tutorial.

## Decisions

- **Placement:** a new web page at `/guide`, rendered in the React SPA (not a
  repo Markdown file or external docs site).
- **Scope:** full app guide (account → create → author → study → share → AI),
  kept terse.
- **Style:** concise cheat-sheet — short sections, minimal copy-paste examples,
  an in-page table of contents.
- **i18n:** fully translated into all four supported locales (en/de/es/fr) under
  a new `guide.*` namespace, like every other content page. Markdown **code
  examples are literal `<pre>` blocks identical across languages**; only the
  surrounding prose/captions are translated.

## Architecture

### Route

`packages/web/src/App.tsx`: add a public route alongside `/privacy` and
`/impressum`:

```tsx
<Route path="/guide" element={<GuidePage />} />
```

Public (outside `ProtectedRoute`) so logged-out visitors and search engines can
read it.

### Page component

`packages/web/src/pages/GuidePage.tsx`, following the established content-page
pattern (see `PrivacyPage.tsx`):

- `useDocumentHead({ title, description })` for SEO.
- `useTranslation()` + `<Trans>` for all prose and inline code/links.
- Tailwind layout: centered container, `prose` body, dark-mode classes matching
  existing pages.
- A back link to `/`, matching `PrivacyPage`'s simplicity.
- An in-page **table of contents** at the top: anchor links (`#section-id`) to
  each section heading. Each `<section>` gets a matching `id`.

Code examples render in `<pre><code>` blocks with literal Markdown text — the
same string in every locale (not passed through `t()`), so authors copy exact
syntax.

### Sections

Each is one `<section id="…">` with an `<h2>` and tight content:

1. **What is flashkarte** — one short paragraph (Markdown decks + spaced
   repetition, study anywhere, AI can help author).
2. **Getting started** — sign up, verify email, where decks live.
3. **Creating a deck** — three ways: web editor (paste Markdown), Android app,
   AI assistant via MCP. Links to the relevant sections/pages.
4. **Deck format** (the core cheat-sheet):
   - `# Title` (first H1), optional `*subtitle*` line (decorative, ignored by the
     parser), `## Category` groupings, `---` separators (ignored).
   - Card format A — bold-numbered: `**1. Front**` then answer line(s) below.
   - Card format B — `Q:` / `A:`: `Q:` opens the front, the first `A:` is the
     answer paragraph, following lines are a second paragraph.
   - Multi-paragraph backs: consecutive lines join into one paragraph; a blank
     line starts a new paragraph.
   - One combined copy-paste example block showing title, categories, and both
     card formats.
5. **Branching decks** — `[label]` anchors before a card, `- option text -> target`
   option lines, and the special `end` target. Short example mirroring the
   parser's forest-path sample.
6. **Deck settings** — "Study in order" (ordered decks: must answer the current
   card correctly to advance; cards appear in strict authored order) and Public
   decks + sharing (public deck pages at `/d/:slug`, discovery at `/explore`).
7. **Studying** — SM-2 spaced repetition in one line; flip / self-grade rating
   scale; multiple-choice mode (note: currently Android only, auto-generated
   distractors).
8. **Connect an AI assistant** — Settings → create an API key + copy the MCP URL;
   point a client (e.g. Claude.ai) at it; the AI then creates/manages decks on
   your behalf using your own AI account. Link to `/settings`.

### i18n

- Add a `guide` namespace to `packages/web/src/i18n/locales/{en,de,es,fr}.json`
  with keys for: page title/description, TOC labels, each section heading, and
  each prose string. Mirror the nesting/style of existing namespaces
  (e.g. `privacy`).
- Code examples are **not** translation keys — they live in the component as
  literal constants rendered in `<pre>`.
- de/es/fr translations authored to match the tone of existing locale files.

### Linking / discoverability

- Add a **Guide** link to:
  - `LandingPage.tsx` footer (next to Privacy / Impressum).
  - `AuthPage.tsx` footer (next to Privacy / Impressum).
  - `CreateDeckPage.tsx` — a small "Deck format guide" link near the editor.
  - The deck list / `LibraryPage.tsx` header — a link to the guide.
- Add a `common.guide` label key (translated in all four locales) for the link
  text.

### SEO / sitemap

- Add `/guide` to the sitemap generator (the SEO infra in `packages/server`) so
  it is indexed, consistent with how other public routes are handled.

## Testing

- `packages/web/src/pages/GuidePage.test.tsx`: render the page and assert the
  major section headings appear (deck format, branching, deck settings,
  studying, connect AI) and that the TOC renders anchor links.
- Verify the `guide.*` keys exist in all four locale JSON files (extend or follow
  any existing locale-parity check; otherwise assert key presence in the test).

## Out of scope (YAGNI)

- No separate documentation site or MDX/Markdown-rendering pipeline — plain JSX +
  i18n like every other page.
- No in-editor live syntax help/tooltips.
- No per-feature deep-dive pages; one consolidated page only.
