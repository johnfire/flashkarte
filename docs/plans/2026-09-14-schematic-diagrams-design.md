# Schematic diagrams in cards — design

**Date:** 2026-09-14 · Implements spec `03-media-images.md`, with two scope adjustments agreed
during brainstorming (see below).

## Problem

The three "Art of Electronics" decks (Ch.1–3, 252 cards) describe circuit topologies in text
only. Cards involving two or more connected components (voltage dividers, RC filters, current
mirrors, differential pairs, analog switches, etc.) are harder to hold in mind without a picture.
flashkarte has no image support today — front/back render as plain, HTML-escaped text on both
web and Android; there's no asset upload/hosting.

## Decisions (from brainstorming)

1. **Hosting:** bundle SVGs as static assets in the app itself
   (`packages/web/public/schematics/*.svg`), served by the app's own domain — same mechanism
   already used for `favicon.svg`/`og.png`. No third-party host, no upload feature.
2. **URL rule:** widen spec 03's "https:// only" rule to also accept root-relative paths
   (`/schematics/foo.svg`). Bundled assets don't need a hardcoded domain, and this keeps local
   dev, staging, and prod all working identically. Absolute `https://` URLs remain supported too
   (for anyone who _does_ want to link an external image).
3. **Platform scope:** web only for this pass. Android (Coil or link-fallback, per spec) is a
   deliberate fast-follow, not done here.
4. **Existing decks:** Ch.2 and Ch.3 have zero study history — safe to delete and recreate.
   Ch.1 had 50/92 cards already reviewed; user confirmed resetting that progress is acceptable
   to get diagrams in cleanly, rather than building a per-card edit endpoint. All three decks are
   deleted and recreated with diagrams baked into the relevant cards' Markdown from the start.
5. **Parked for later:** a "second screen" / companion-display idea for viewing diagrams on a
   bigger screen while studying on mobile. Not built now — revisit after hands-on use shows
   whether mobile legibility is actually a problem.

## Rendering

One regex, not a markdown engine, matching `![alt](url)` where `url` starts with `https://` or
`/`:

```
/!\[([^\]]*)\]\(((?:https:\/\/|\/)[^\s)]+)\)/g
```

A shared helper, `renderCardText(text: string): ReactNode[]`, splits card text on this pattern
and renders matches as `<img src=… alt=… loading="lazy" style={{maxWidth: "100%"}} />`; anything
that doesn't match the URL prefix rule stays literal text, unchanged from today's behavior. Alt
text and URL flow through as React props (never `dangerouslySetInnerHTML`), so there's no HTML
injection surface — `"/><script>` in alt text just becomes an inert string attribute.

Used everywhere card text renders: `StudyPage` (front/back) and deck/library preview components.
A broken image URL falls back to the `alt` text via normal `<img>` behavior; the card stays fully
ratable regardless (anti-fragility — a bad image never blocks study).

## Schematic assets

Plain black-on-white line schematics (readable in light or dark app theme, since the image
carries its own background), matching the textbook's own visual convention: zigzag resistor,
parallel-line capacitor, coil inductor, triangle+bar diode, standard BJT/FET symbols, ground
symbol, circled voltage source. Consistent `viewBox`, stroke width, and label font across the
set so it reads as one family.

One diagram per _topology_, not per card — e.g. `rc-lowpass.svg` is referenced from every Ch.1
card discussing RC lowpass behavior. Roughly 36 SVGs total (~13 for Ch.1, ~13 for Ch.2, ~10 for
Ch.3), covering the topology cards; pure definition/formula cards stay text-only.

Naming: `packages/web/public/schematics/ch{N}-{slug}.svg`.

## MCP tool docs

`packages/mcp/src/tools/decks.ts` (`create_deck`/`add_cards` descriptions) gets a short mention
of the image syntax so future AI-authored decks know it's available.

## Testing

- Parser corpus (`packages/shared`): confirm `![alt](/x.svg)` and `![alt](https://…)` survive
  `cleanBack()`'s paragraph-joining verbatim (image alone on a line, and inline with text).
- Web component test: renders `<img>` for an allowed URL; leaves other URL schemes as literal
  text; XSS attempt in alt text produces no extra DOM elements; broken URL still allows rating.

## Rollout sequence

1. Implement `renderCardText` + wire into `StudyPage` and preview components.
2. Update MCP tool descriptions.
3. Add parser corpus cases and the web component test.
4. Draw the ~36 SVGs.
5. Verify locally (dev server, a handful of cards from each deck, the XSS/broken-URL cases).
6. Delete and recreate all three AoE decks with image references added to the relevant cards.
7. Commit; push after explicit confirmation.
