# Lesson engine — Slice 0 findings

_Date: 2026-09-19 · Both spikes ran and both are **GO**. What was measured is stated as measured; what
was not tested is listed at the end. See [the build plan](2026-09-19-lesson-engine-build-plan.md)._

## Spike 1: typeset maths rendered on the server

**Question:** can the server turn LaTeX into an image that web and Android both draw correctly, in light
and dark, including a symbol in the middle of a sentence?

**Answer: yes.** Tool: `mathjax-full` 3.2.2 (Apache-2.0), TeX input with all packages, SVG output with the
font cache off (`fontCache: "none"`), so each SVG is self-contained.

**Server side (measured).** Six real formulas from your two subjects (softmax, the attention formula,
`R = V/I`, the RC time constant and cutoff frequency, and two inline symbols `d_k`, `x_i W_Q`):

- 0.6 to 17 ms each (the first is slowest, it includes warm-up); 1.9 to 18.7 KB each.
- No font files, no scripts, no external references.
- Colour is `currentColor`, so the colour is decided by whoever draws it.
- Each SVG reports its size and its **baseline offset** in `ex` units (for example `d_k` is 2.198ex wide,
  1.927ex tall, and hangs 0.357ex below the baseline). That offset is what makes inline symbols line up.

**Web (looked at in a real browser, light and dark).**

- Draw each SVG as an `<img>` with `width`/`height` set in `ex` and `vertical-align` set from the offset.
- A plain `<img>` cannot inherit text colour, so dark mode needs one CSS rule: `filter: invert(1)`. That
  works for single-colour formulas.
- Proof the offset is needed: the same sentence without it shows the symbols floating above the line.

**Android (built a small scratch app with the same Compose and Coil versions as the real app; ran it on an
Android 35 emulator; screenshots looked at, light and dark).**

- The image stack the app already has (Coil 2.7.0 with its SVG decoder) renders the MathJax SVGs correctly,
  including the `ex` units. No new Android dependency is needed.
- Sizes: `1ex = 0.5em` (MathJax's default); the on-screen alignment confirms it.
- Colour: tinting the image with the theme's text colour gives correct light and dark.
- Inline symbols: a Compose `InlineTextContent` placeholder aligned above the baseline with height
  `(height - depth)`, with the image allowed to overflow downward by the depth. With the offset, `d_k` and
  `x_i W_Q` sit on the baseline. Without it (the control), they ride high, as on the web.

**Dependency finding for slice 6.** `mathjax-full` pulls in `speech-rule-engine`, which depends on a
vulnerable `@xmldom/xmldom` (1 high, 1 moderate advisory). CI fails on audit findings. In a scratch install
`npm audit fix` brought it to 0 vulnerabilities and the six SVGs were **byte-identical** afterwards. Slice 6
must repeat that against the repo's lockfile and CI audit, and justify the new dependency (it runs only when a
screen is saved). `node_modules` for it is about 51 MB, worth knowing for the server image.

**Decisions this leads to:**

- A formula asset stores: the LaTeX, the spoken text, the SVG, and width, height and depth in `em`
  (the `ex` values times 0.5).
- Maths is single-colour, so tint (Android) and invert (web) are correct for it. **Coloured diagrams are a
  different case:** inverting would garble them. How they look in dark mode is unresolved. I have not checked
  how the existing `ch1-*.svg` schematics look on a dark background; slice 5 must decide (diagrams drawn on a
  transparent background with theme-safe colours, or a light and a dark version).

## Spike 2: exact-decimal screen numbers

**Question:** can screen numbers like 213, 213.010, 213.025 be exact, sortable, insertable and safe?

**Answer: yes.** Kept as product code: `packages/shared/src/lessons/screen-number.ts` (32 tests, all passing).

- **Exact.** Numbers are strings and the arithmetic is BigInt, never floating point, so no number can be off by
  a rounding error and silently reorder a lesson. Up to 12 decimals.
- **Canonical spelling.** A whole number has no fraction ("213"); a fractional one shows at least three decimals
  and no trailing zero after the third ("213.010", "213.0225"). `213.01` and `213.010` are the same number.
- **Suggesting a number.** `suggestScreenNumber(before, after)`: the next whole number when appending; else
  `before + 0.010` when that leaves room; else the shortest number between the two neighbours. It reproduces
  your examples exactly: 213 then 213.010, then 213.020, then 213.025.
- **Tested:** your examples, 2000 seeded random pairs (always strictly between, valid, canonical), invalid
  inputs, and nested inserts.
- **A bug the tests found in my own first version:** the step was 0.001, not 0.010 (I had ten times too small a
  unit). The example test failed and it was fixed.
- **Capacity, measured:** in the worst case (always inserting directly after the same screen, halving one gap
  each time) **31 nested inserts** fit before the gap runs out, and the function then says so clearly. Normal
  editing (inserting after the last-inserted screen) gives 98 sequential inserts before any splitting starts.

**Postgres (checked in a real database).** Use the type `numeric`.

- It sorts numerically, and a unique constraint treats `213.01` and `213.010` as the same number.
- **It hands back what was stored** (`213.0100` comes back as `213.0100`), so numbers are normalised on read.
- **A trap for slice 1:** in `SELECT number::text ... ORDER BY number`, the output column named `number` is text,
  so the sort silently becomes alphabetical ("10" before "9"). Always order by the qualified column
  (`ORDER BY screens.number`) or give the output a different name. Slice 1 will have a test that fails on a
  text sort.

## Not tested

- Formulas wider than a phone. The widest (the attention formula) used roughly 93% of the width of a 411dp
  screen at 18sp, so wider ones need a rule (scroll sideways, or scale down); not designed yet.
- Matrices, multi-line derivations, very large or very small formulas.
- An inline formula wrapping at a line end (it is an image, so it cannot break across lines).
- Screen readers (TalkBack) reading the alt text; text selection or copying from a formula.
- The maths pipeline inside the real server and real apps (only a scratch app and a test page).

## Machine notes

- The Android emulator works here: KVM is available and an Android 35 x86_64 image is installed. `avdmanager`
  failed on a missing `devices.xml`, so the virtual device was written by hand (`config.ini` with
  `image.sysdir.1=system-images/android-35/google_apis/x86_64/`); it boots headless with
  `-no-window -gpu swiftshader_indirect`. Scratch Gradle projects outside the repo need `JAVA_HOME` set to JDK 21
  or Gradle picks up Java 26 and fails. This makes rendered Android checks possible for later slices, which the
  reading-cards work could not do. The device and all scratch servers were removed afterwards.
