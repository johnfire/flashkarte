# User Guide Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public, fully-i18n in-app User Guide page at `/guide` that explains how to use flashkarte — especially how to design Markdown card decks — and link it from the app and sitemap.

**Architecture:** A new React SPA page (`GuidePage.tsx`) follows the existing content-page pattern (`PrivacyPage.tsx`): `useDocumentHead` for SEO, `useTranslation`/`<Trans>` for prose, Tailwind for layout. All prose lives under a new `guide.*` i18n namespace in en/de/es/fr; Markdown code examples are literal `<pre>` constants in the component (identical across languages). The server adds `/guide` to its static-meta routes and sitemap.

**Tech Stack:** React, react-router-dom, react-i18next, Tailwind, Vite, Vitest + Testing Library (web); Express + Jest (server).

---

## File Structure

- **Create:** `packages/web/src/pages/GuidePage.tsx` — the guide page component (sections + TOC + literal example blocks).
- **Create:** `packages/web/src/pages/GuidePage.test.tsx` — render test (sections + TOC anchors).
- **Create:** `packages/web/src/i18n/localesParity.test.ts` — asserts `guide.*` and `common.guide` keys exist in all four locales.
- **Modify:** `packages/web/src/i18n/locales/{en,de,es,fr}.json` — add `guide` namespace + `common.guide`.
- **Modify:** `packages/web/src/App.tsx` — register the `/guide` route.
- **Modify:** `packages/web/src/pages/LandingPage.tsx` — footer Guide link.
- **Modify:** `packages/web/src/pages/AuthPage.tsx` — footer Guide link.
- **Modify:** `packages/web/src/pages/CreateDeckPage.tsx` — "Deck format guide" link near editor.
- **Modify:** `packages/web/src/pages/LibraryPage.tsx` — Guide link in header.
- **Modify:** `packages/server/src/seo/meta.ts` — `/guide` entry in `PAGES`.
- **Modify:** `packages/server/src/seo/meta.test.ts` — assert `/guide` meta.
- **Modify:** `packages/server/src/seo/mount.ts` — add `/guide` to `STATIC_HTML_ROUTES`.
- **Modify:** `packages/server/src/app.ts` — add `/guide` to `sitemapUrls`.

---

## Task 1: Add the `guide` i18n namespace (English) + `common.guide`

**Files:**

- Modify: `packages/web/src/i18n/locales/en.json`

- [ ] **Step 1: Add `common.guide` to en.json**

In the `common` object in `packages/web/src/i18n/locales/en.json`, add a `guide` key:

```json
"guide": "Guide",
```

- [ ] **Step 2: Add the full `guide` namespace to en.json**

Add this top-level key to `packages/web/src/i18n/locales/en.json` (sibling of `privacy`, `impressum`):

```json
"guide": {
  "back": "Back",
  "metaTitle": "Guide — flashkarte",
  "metaDescription": "How to use flashkarte: write Markdown flashcard decks, study with spaced repetition, share decks, and let your AI build decks for you.",
  "title": "How to use flashkarte",
  "intro": "flashkarte turns plain Markdown into spaced-repetition flashcards you can study on the web and on Android, always in sync. This guide shows how to create and design decks, study them, share them, and connect an AI assistant.",
  "tocHeading": "On this page",
  "tocStart": "Getting started",
  "tocCreate": "Creating a deck",
  "tocFormat": "Deck format",
  "tocBranching": "Branching decks",
  "tocSettings": "Deck settings",
  "tocStudy": "Studying",
  "tocAI": "Connect an AI assistant",
  "startHeading": "Getting started",
  "startBody": "Sign up with an email and password, then confirm the verification email. Your decks and study progress are tied to your account and sync across every device you sign in on.",
  "createHeading": "Creating a deck",
  "createIntro": "There are three ways to create a deck:",
  "createWeb": "On the web, open the deck editor, paste or type Markdown in the format below, and save. A live preview shows the parsed cards before you save.",
  "createAndroid": "In the Android app, create or import a deck the same way using the same Markdown format.",
  "createAI": "Let an AI assistant build a deck for you — see Connect an AI assistant below.",
  "formatHeading": "Deck format",
  "formatIntro": "A deck is plain Markdown. The first heading is the title; an optional italic line under it is decorative and ignored. Use second-level headings to group cards into categories, and a line of dashes as a visual separator.",
  "formatCardsIntro": "Write cards in either of two formats — you can mix both in one deck:",
  "formatBold": "Numbered bold front: a bold line like \"**1. front**\" starts a card; the lines below it are the answer.",
  "formatQA": "Q:/A: format: a \"Q:\" line is the front; the first \"A:\" line is the answer, and any lines after it become a second paragraph.",
  "formatParagraphs": "Within an answer, consecutive lines join into one paragraph; leave a blank line to start a new paragraph.",
  "formatExampleCaption": "Example deck:",
  "branchingHeading": "Branching decks",
  "branchingBody": "Turn a deck into a choose-your-path sequence. Put an anchor like \"[label]\" on its own line before a card, then give each option as a line \"- choice text -> target\", where target is another anchor label (or \"end\" to finish). A card with no options is a normal card.",
  "branchingExampleCaption": "Example branching deck:",
  "settingsHeading": "Deck settings",
  "settingsOrdered": "Study in order: when enabled, cards are shown in their authored order and you must answer the current card correctly before advancing — useful for sequences that build on each other.",
  "settingsPublic": "Public decks: make a deck public to get a shareable page and have it listed on the Explore page, where anyone can preview it and clone it into their own account.",
  "studyHeading": "Studying",
  "studySrs": "flashkarte schedules reviews with the SM-2 spaced-repetition algorithm, so cards you find hard come back sooner and easy ones later.",
  "studyRatings": "In the default flip mode you reveal the answer and rate your recall — Again, Hard, Good, or Easy — which sets when the card is next due.",
  "studyChoice": "The Android app also offers a multiple-choice mode that builds answer options automatically from your other cards and grades you on the tap.",
  "aiHeading": "Connect an AI assistant",
  "aiBody": "An AI assistant can build decks for you and push them straight into your account, using your own AI account.",
  "aiStep1": "In Settings, generate an API key and copy the MCP server URL.",
  "aiStep2": "Add the URL as a custom connector in your AI client (for example claude.ai or Claude Desktop) and sign in with your flashkarte account.",
  "aiStep3": "Ask it to build a deck, e.g. \"Turn this into a flashkarte deck: …\", and the new deck appears in your account."
}
```

- [ ] **Step 3: Verify the JSON parses**

Run: `node -e "require('./packages/web/src/i18n/locales/en.json'); console.log('en ok')"`
Expected: prints `en ok` (no JSON syntax error).

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/i18n/locales/en.json
git commit -m "feat(web): add English guide i18n strings"
```

---

## Task 2: Translate the `guide` namespace into de, es, fr

**Files:**

- Modify: `packages/web/src/i18n/locales/de.json`
- Modify: `packages/web/src/i18n/locales/es.json`
- Modify: `packages/web/src/i18n/locales/fr.json`

- [ ] **Step 1: Add `common.guide` to each locale**

Add to the `common` object in each file:

- de.json: `"guide": "Anleitung",`
- es.json: `"guide": "Guía",`
- fr.json: `"guide": "Guide",`

- [ ] **Step 2: Add the translated `guide` namespace to each locale**

Add a `guide` top-level object to de.json, es.json, and fr.json with **the same keys** as the English block in Task 1. Translate **every value** into the target language, matching the tone and formality of the existing `privacy`/`settings` strings in that file. Do not leave any value in English. Keep the literal tokens inside quotes (`"**1. front**"`, `"[label]"`, `"- choice text -> target"`, `"end"`, `"Q:"`, `"A:"`, `"Turn this into a flashkarte deck: …"`) unchanged — they are literal Markdown/UI syntax, not prose. For tone calibration, here are the first three keys in each language; translate the remaining keys in the same register:

de.json:

```json
"guide": {
  "back": "Zurück",
  "metaTitle": "Anleitung — flashkarte",
  "metaDescription": "So nutzt du flashkarte: Markdown-Lernkartendecks schreiben, mit verteilter Wiederholung lernen, Decks teilen und deine KI Decks erstellen lassen.",
  "...": "translate every remaining key from the English block here"
}
```

es.json:

```json
"guide": {
  "back": "Volver",
  "metaTitle": "Guía — flashkarte",
  "metaDescription": "Cómo usar flashkarte: crea mazos de tarjetas en Markdown, estudia con repetición espaciada, comparte mazos y deja que tu IA cree mazos por ti.",
  "...": "translate every remaining key from the English block here"
}
```

fr.json:

```json
"guide": {
  "back": "Retour",
  "metaTitle": "Guide — flashkarte",
  "metaDescription": "Comment utiliser flashkarte : créez des paquets de cartes en Markdown, révisez avec la répétition espacée, partagez des paquets et laissez votre IA créer des paquets pour vous.",
  "...": "translate every remaining key from the English block here"
}
```

- [ ] **Step 3: Verify each JSON parses**

Run: `node -e "['de','es','fr'].forEach(l=>{require('./packages/web/src/i18n/locales/'+l+'.json');console.log(l,'ok')})"`
Expected: prints `de ok`, `es ok`, `fr ok`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/i18n/locales/de.json packages/web/src/i18n/locales/es.json packages/web/src/i18n/locales/fr.json
git commit -m "feat(web): translate guide strings (de/es/fr)"
```

---

## Task 3: Locale parity test for guide keys

**Files:**

- Create: `packages/web/src/i18n/localesParity.test.ts`

- [ ] **Step 1: Write the test**

Create `packages/web/src/i18n/localesParity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

const locales = { de, es, fr } as Record<string, Record<string, unknown>>;

function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("guide i18n parity", () => {
  const enGuideKeys = keysOf(en.guide as Record<string, unknown>, "guide.");

  it("every locale has all guide keys", () => {
    for (const [name, loc] of Object.entries(locales)) {
      const locKeys = new Set(
        keysOf((loc.guide ?? {}) as Record<string, unknown>, "guide."),
      );
      const missing = enGuideKeys.filter((k) => !locKeys.has(k));
      expect(missing, `${name} missing: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("every locale has common.guide", () => {
    for (const [name, loc] of Object.entries(locales)) {
      expect(
        (loc.common as Record<string, unknown>)?.guide,
        `${name} missing common.guide`,
      ).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test --workspace=packages/web -- localesParity`
Expected: PASS (assuming Tasks 1–2 are complete). If a key is missing in de/es/fr, fix that locale file, then re-run.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/i18n/localesParity.test.ts
git commit -m "test(web): guide i18n locale parity"
```

---

## Task 4: GuidePage component (TDD)

**Files:**

- Create: `packages/web/src/pages/GuidePage.test.tsx`
- Create: `packages/web/src/pages/GuidePage.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/pages/GuidePage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import "../i18n";
import { GuidePage } from "./GuidePage";

function renderPage() {
  return render(
    <MemoryRouter>
      <GuidePage />
    </MemoryRouter>,
  );
}

describe("GuidePage", () => {
  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /how to use flashkarte/i }),
    ).toBeInTheDocument();
  });

  it("renders all major section headings", () => {
    renderPage();
    for (const name of [
      /getting started/i,
      /creating a deck/i,
      /deck format/i,
      /branching decks/i,
      /deck settings/i,
      /studying/i,
      /connect an ai assistant/i,
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });

  it("renders a table of contents that links to sections", () => {
    renderPage();
    const toc = screen.getByRole("navigation", { name: /on this page/i });
    expect(toc.querySelector('a[href="#format"]')).not.toBeNull();
    expect(toc.querySelector('a[href="#branching"]')).not.toBeNull();
  });

  it("shows literal Markdown examples", () => {
    renderPage();
    expect(screen.getByText(/# Spanish Basics/)).toBeInTheDocument();
    expect(
      screen.getByText(/Go left toward the cave -> cave/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=packages/web -- GuidePage`
Expected: FAIL — cannot resolve `./GuidePage` (module not found).

- [ ] **Step 3: Create the component**

Create `packages/web/src/pages/GuidePage.tsx`:

```tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../seo/useDocumentHead";

const FORMAT_EXAMPLE = `# Spanish Basics
*A starter deck*

## Greetings

**1. hola**
hello

**2. buenos días**
good morning
Used until about noon.

## Numbers

Q: uno
A: one

Q: dos
A: two`;

const BRANCHING_EXAMPLE = `# Forest Path

[start]
**1. You reach a fork. Which way?**
- Go left toward the cave -> cave
- Go right -> meadow

[cave]
**2. A bear blocks the cave.**
- Sneak past -> treasure
- Retreat -> start

[meadow]
**3. A peaceful clearing.**
You rest here.`;

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-100 p-4 text-xs leading-relaxed text-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <code>{children}</code>
    </pre>
  );
}

export function GuidePage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("guide.metaTitle"),
    description: t("guide.metaDescription"),
  });

  const toc: [string, string][] = [
    ["start", t("guide.tocStart")],
    ["create", t("guide.tocCreate")],
    ["format", t("guide.tocFormat")],
    ["branching", t("guide.tocBranching")],
    ["settings", t("guide.tocSettings")],
    ["study", t("guide.tocStudy")],
    ["ai", t("guide.tocAI")],
  ];

  const h2 =
    "text-lg font-semibold text-gray-900 dark:text-gray-100 scroll-mt-6";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white dark:bg-gray-800 px-6 py-8 shadow sm:px-10">
        <Link to="/" className="text-sm text-indigo-600">
          {t("guide.back")}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{t("guide.title")}</h1>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          {t("guide.intro")}
        </p>

        <nav
          aria-label={t("guide.tocHeading")}
          className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("guide.tocHeading")}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-indigo-600">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="prose prose-sm mt-8 max-w-none space-y-8 text-gray-700 dark:text-gray-300">
          <section id="start" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.startHeading")}</h2>
            <p className="mt-2">{t("guide.startBody")}</p>
          </section>

          <section id="create" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.createHeading")}</h2>
            <p className="mt-2">{t("guide.createIntro")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("guide.createWeb")}</li>
              <li>{t("guide.createAndroid")}</li>
              <li>{t("guide.createAI")}</li>
            </ul>
          </section>

          <section id="format" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.formatHeading")}</h2>
            <p className="mt-2">{t("guide.formatIntro")}</p>
            <p className="mt-2">{t("guide.formatCardsIntro")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("guide.formatBold")}</li>
              <li>{t("guide.formatQA")}</li>
              <li>{t("guide.formatParagraphs")}</li>
            </ul>
            <p className="mt-3 font-medium">
              {t("guide.formatExampleCaption")}
            </p>
            <Code>{FORMAT_EXAMPLE}</Code>
          </section>

          <section id="branching" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.branchingHeading")}</h2>
            <p className="mt-2">{t("guide.branchingBody")}</p>
            <p className="mt-3 font-medium">
              {t("guide.branchingExampleCaption")}
            </p>
            <Code>{BRANCHING_EXAMPLE}</Code>
          </section>

          <section id="settings" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.settingsHeading")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("guide.settingsOrdered")}</li>
              <li>{t("guide.settingsPublic")}</li>
            </ul>
          </section>

          <section id="study" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.studyHeading")}</h2>
            <p className="mt-2">{t("guide.studySrs")}</p>
            <p className="mt-2">{t("guide.studyRatings")}</p>
            <p className="mt-2">{t("guide.studyChoice")}</p>
          </section>

          <section id="ai" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.aiHeading")}</h2>
            <p className="mt-2">{t("guide.aiBody")}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t("guide.aiStep1")}</li>
              <li>{t("guide.aiStep2")}</li>
              <li>{t("guide.aiStep3")}</li>
            </ol>
            <p className="mt-3">
              <Link to="/settings" className="text-indigo-600">
                {t("guide.tocAI")} →
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=packages/web -- GuidePage`
Expected: PASS (all four tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/GuidePage.tsx packages/web/src/pages/GuidePage.test.tsx
git commit -m "feat(web): add GuidePage component"
```

---

## Task 5: Register the `/guide` route

**Files:**

- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Import GuidePage**

In `packages/web/src/App.tsx`, add the import next to the other page imports:

```tsx
import { GuidePage } from "./pages/GuidePage";
```

- [ ] **Step 2: Add the public route**

In `App.tsx`, add the route alongside `/privacy` and `/impressum` (inside `<Routes>`, before the `ProtectedRoute` block):

```tsx
<Route path="/guide" element={<GuidePage />} />
```

- [ ] **Step 3: Verify the build/tests pass**

Run: `npm test --workspace=packages/web -- GuidePage`
Expected: PASS (unchanged).

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): route /guide to GuidePage"
```

---

## Task 6: Add Guide links to footers and in-app pages

**Files:**

- Modify: `packages/web/src/pages/LandingPage.tsx`
- Modify: `packages/web/src/pages/AuthPage.tsx`
- Modify: `packages/web/src/pages/CreateDeckPage.tsx`
- Modify: `packages/web/src/pages/LibraryPage.tsx`

- [ ] **Step 1: LandingPage footer link**

In `packages/web/src/pages/LandingPage.tsx`, in the footer's links paragraph (currently containing the Privacy and Impressum links), add a Guide link as the first link:

```tsx
<Link to="/guide" className="hover:text-slate-300">
  {t("common.guide")}
</Link>
```

Place it immediately before the existing `<Link to="/privacy" …>`.

- [ ] **Step 2: AuthPage footer link**

In `packages/web/src/pages/AuthPage.tsx`, in the `<p className="space-x-4 text-center text-xs …">` that holds the Privacy/Impressum links, add a Guide link before the Privacy link:

```tsx
<Link to="/guide" className="hover:text-gray-600 dark:hover:text-gray-300">
  {t("common.guide")}
</Link>
```

- [ ] **Step 3: CreateDeckPage editor link**

In `packages/web/src/pages/CreateDeckPage.tsx`, immediately after the `<h1 …>{t("createDeck.title")}</h1>` line, add a link to the deck-format section of the guide:

```tsx
<p className="mb-4 text-sm">
  <Link to="/guide#format" className="text-indigo-600">
    {t("common.guide")}
  </Link>
</p>
```

(Add `import { Link } from "react-router-dom";` if not already imported in this file.)

- [ ] **Step 4: LibraryPage header link**

In `packages/web/src/pages/LibraryPage.tsx`, inside the `<header className="mb-6 flex items-center justify-between">`, the right side currently has a single `<Link to="/" …>`. Wrap the existing link and a new Guide link in a `<div className="flex gap-4">` so both show:

```tsx
<div className="flex gap-4 text-sm">
  <Link to="/guide" className="text-indigo-600">
    {t("common.guide")}
  </Link>
  <Link to="/" className="text-indigo-600">
    {t("library.myDecks")}
  </Link>
</div>
```

Replace the existing standalone `<Link to="/" className="text-sm text-indigo-600">{t("library.myDecks")}</Link>` with the block above.

- [ ] **Step 5: Run web tests**

Run: `npm test --workspace=packages/web`
Expected: PASS (existing tests unaffected; no test asserts the absence of these links).

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/pages/LandingPage.tsx packages/web/src/pages/AuthPage.tsx packages/web/src/pages/CreateDeckPage.tsx packages/web/src/pages/LibraryPage.tsx
git commit -m "feat(web): link the guide from footers, editor, and library"
```

---

## Task 7: Server SEO — static meta for `/guide` (TDD)

**Files:**

- Modify: `packages/server/src/seo/meta.test.ts`
- Modify: `packages/server/src/seo/meta.ts`

- [ ] **Step 1: Write the failing test**

In `packages/server/src/seo/meta.test.ts`, add a test inside the `describe("staticMeta", …)` block:

```ts
it("guide has its own title and canonical, no JSON-LD", () => {
  const m = staticMeta("/guide");
  expect(m.title).toContain("Guide");
  expect(m.canonical).toContain("/guide");
  expect(m.jsonLd).toBeUndefined();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace=packages/server -- meta`
Expected: FAIL — `/guide` falls back to the `/` page, so `m.title` is the home title (not "Guide") and `m.jsonLd` is defined.

- [ ] **Step 3: Add the `/guide` page entry**

In `packages/server/src/seo/meta.ts`, add to the `PAGES` record (after `/impressum`):

```ts
"/guide": {
  title: "Guide — flashkarte",
  description:
    "How to use flashkarte: write Markdown flashcard decks, study with spaced repetition, share decks, and let your AI build decks for you.",
},
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace=packages/server -- meta`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/seo/meta.ts packages/server/src/seo/meta.test.ts
git commit -m "feat(server): static SEO meta for /guide"
```

---

## Task 8: Server — serve `/guide` HTML and list it in the sitemap

**Files:**

- Modify: `packages/server/src/seo/mount.ts`
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Add `/guide` to static HTML routes**

In `packages/server/src/seo/mount.ts`, update `STATIC_HTML_ROUTES`:

```ts
const STATIC_HTML_ROUTES = [
  "/",
  "/explore",
  "/privacy",
  "/impressum",
  "/guide",
];
```

- [ ] **Step 2: Add `/guide` to the sitemap**

In `packages/server/src/app.ts`, in the `base` array inside `sitemapUrls`, add after the `/impressum` entry:

```ts
{ loc: `${origin}/guide`, changefreq: "monthly", priority: "0.6" },
```

- [ ] **Step 3: Run the server SEO tests**

Run: `npm test --workspace=packages/server -- seo`
Expected: PASS (existing mount/sitemap tests still pass; `/guide` now served and listed).

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/seo/mount.ts packages/server/src/app.ts
git commit -m "feat(server): serve /guide HTML and add it to the sitemap"
```

---

## Task 9: Full verification

- [ ] **Step 1: Build shared (types) and run all tests**

Run:

```bash
npm run build --workspace=packages/shared
npm test
```

Expected: all workspace test suites PASS.

- [ ] **Step 2: Type-check / build the web app**

Run: `npm run build --workspace=packages/web`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual smoke (optional)**

Start the web dev server and visit `/guide`; confirm the page renders, the TOC anchors jump to sections, examples display, and switching language (en/de/es/fr) translates the prose while the code examples stay identical.

---

## Self-Review Notes

- **Spec coverage:** `/guide` route (Task 5), GuidePage with all 8 sections incl. deck format + branching (Task 4), deck settings/study/AI sections (Task 4), full i18n in 4 locales (Tasks 1–2) with parity guard (Task 3), discoverability links on landing/auth/editor/library (Task 6), SEO static meta + HTML route + sitemap (Tasks 7–8). All spec sections map to a task.
- **No placeholders:** All code shown in full. The only deferred content is the de/es/fr translation _values_ (Task 2), which are content to be authored in-language by the implementer; the keys, structure, tone anchors, and a parity test that fails on any missing key are all specified.
- **Naming consistency:** `guide.*` keys are identical between the English source (Task 1), the component usage (Task 4), and the parity test (Task 3). `common.guide` is used by every link (Task 6) and added in Tasks 1–2.
