# Help System Plan

Status: implemented (2026-07-23). Web `/help` center + hints and Android `HelpScreen` + hints are built, tested, and building cleanly on both platforms.

## Goal

Help new users learn flashkarte's non-obvious concepts (Markdown deck format,
branching decks, SM-2 study ratings, the deck-card chip legend, AI/MCP deck
creation, sharing) through **two layers**:

1. A **multi-page help center** (written explanation).
2. **Inline & empty-state hints** placed where users get stuck — _not_ hover
   tooltips (this is a touch-first study app; hover text is invisible on mobile).

Covers **web + Android**. Web is fully internationalized (en/de/es/fr, CI
parity-tested); Android is currently English-only.

## Starting state

- Web already has a single `/guide` page ([GuidePage.tsx](../packages/web/src/pages/GuidePage.tsx))
  with a TOC and 7 sections, fully translated. Linked from landing footer, auth,
  create-deck, library — but **not** from the logged-in home (`DeckListPage`).
- Android has only `BranchingHelpScreen.kt` (branching help), strings hardcoded
  in English, not linked into any help hub.
- No reusable tooltip/hint component exists on either platform. Web has 3 native
  `title=` attributes total.
- **i18n asymmetry:** web = 4 locales, enforced by
  [localesParity.test.ts](../packages/web/src/i18n/localesParity.test.ts).
  Android = no `strings.xml`, no `values-*` locale dirs, no `stringResource`.

## Decisions locked

| # | Decision | Choice |
|---|----------|--------|
| 1 | Platforms | Web **and** Android |
| 2 | In-context help mechanism | Inline + empty-state hints (no hover tooltips, no first-run tour) |
| 3 | Written help shape | Multi-page help center (not one long page) |
| 4 | Android help depth | **Single** scrollable Help screen (not a multi-screen mirror) |
| 5 | Android help localization | **All 4 languages** — introduces Android's first localized strings |

### Consequence of #5 (flagged, accepted)

The Help screen becomes the only localized surface on Android; the rest of the
app stays hardcoded English. This requires introducing Android localization
infrastructure (`res/values/strings.xml` + `values-de/`, `values-es/`,
`values-fr/`) scoped to help strings only. We do **not** localize the rest of
the Android app as part of this work.

## Content architecture (shared source of truth)

Six focused topics. Most content already exists in the web guide's i18n keys and
just needs re-homing — keeps new-translation cost down.

| Topic | Covers | Seed source |
|-------|--------|-------------|
| Getting started | sign up, the create→study loop, where things live | new + `guide.start`/`guide.create` |
| Writing decks | Markdown format, `**1.**` fronts and `Q:/A:` | `guide.format` |
| Branching decks | `[name]` anchors, `-> target`, `end` | `guide.branching` (web) + Android `BranchingHelpScreen` |
| Studying & spaced repetition | SM-2, Again/Hard/Good/Easy, "due", the 6-chip legend | **expand** — weakest area today |
| Creating decks with AI | MCP server + API-key setup, step by step | `guide.ai` |
| Sharing & exploring | public decks, Library, Explore, import | new |

## Web implementation

### Help center
- New `/help` index page linking the six topics (each its own route, e.g.
  `/help/studying`, or anchored sections — decide at build time; routes preferred
  for "a few pages").
- Keep `/guide` working via redirect to `/help` so existing links don't break.
- All new strings added to en/de/es/fr; parity test must pass.

### Inline & empty-state hints (highest value per effort)
- **DeckListPage** ([DeckListPage.tsx](../packages/web/src/pages/DeckListPage.tsx)):
  add a "Help" link to the header (currently absent); turn the bare `decks.empty`
  message into a first-run hint ("Create your first deck →" + help link).
- **6-chip legend** (viewed/new/again/hard/good/easy on each deck card): add a
  compact legend or "what do these mean?" affordance linking to the Studying page.
- **StudyPage** ([StudyPage.tsx](../packages/web/src/pages/StudyPage.tsx)): one
  line under the rating buttons explaining what Again/Hard/Good/Easy do to
  scheduling.
- **CreateDeckPage**: reinforce the existing format link with an inline
  mini-example / placeholder.
- **Settings → API keys** ([ApiKeysSection.tsx](../packages/web/src/pages/settings/ApiKeysSection.tsx)):
  inline explanation of what the key is for + link to the AI help page.

## Android implementation

- Introduce localization infra: `res/values/strings.xml` + `values-de/`,
  `values-es/`, `values-fr/`, scoped to help/hint strings only.
- Build **one** scrollable `HelpScreen` covering the six topics; fold the existing
  `BranchingHelpScreen` content into it (or link to it as one section).
- Add an entry point from Settings (and/or nav) to the Help screen.
- Add matching empty-state / inline hints on the Android DeckList and Study
  screens.

## Open items to resolve at build time (not blockers)

- Web help: separate routes per topic vs. one page with anchors. Leaning routes.
- Exact copy for each hint (kept short; links out to the help center for depth).
- Whether the chip legend is always-visible vs. behind an affordance.
- Android: keep `BranchingHelpScreen` as a standalone route linked from Help, or
  inline its content.

## Cost drivers

- **Translation, not React/Compose.** Every new web string × 4 locales (parity-
  enforced); every Android help string × 4 locales (new infra). Reusing existing
  guide text is the main lever to keep this down.
- Android localization setup is one-time but new to the codebase.
