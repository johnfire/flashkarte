# English GDPR Basics course deployment

Deployed 8 October 2026. Chris authorised building the course and sharing it to Community as soon as it was built
(7 October 2026). He confirmed that the connected learnwohl account owns it.

- Course: **GDPR Basics for Business: Personal Data, Rights and Duties**.
- Reference: **65**.
- Subject UUID: `87830aef-a6c8-49cb-9f68-873e1632263e`.
- [Open the course](https://learnwohl.app/learn/87830aef-a6c8-49cb-9f68-873e1632263e).
- Language: English. 6 modules, 40 lessons (33 core, 7 extension), 73 concepts, 130 graph edges (113 `requires`,
  17 `suggests`).
- Content: 227 sourced screens and 146 questions, each with a reworded retest and an explanation for every option.
- Visibility, as returned by `update_subject`: `is_public: true`, `is_official: false`, `locale: en`, updated
  `2026-10-08T03:06:58.508Z`.

All lessons stay in **testing** and are recorded as AI-authored. No `finish_lesson` calls were made. The course
description and the first screen say it is an **educational draft and not legal advice**. No legal professional
has reviewed it.

## Verification

Done:

- **Local checks**, all passing on the final content:
  - `curriculum_validation.py`: 40 lessons, 73 concepts, 130 edges;
  - `lesson_validation.py`: 40 lessons, 227 screens, 146 questions with retests;
  - 16 Python tests;
  - `npm run lint`, `npm run format:check`, and the server typecheck (`tsc --noEmit`).
- **Real-database test.** `gdpr-course.integration.test.ts` imports every fixture into Postgres 16 with zero issues,
  checks 6 modules, and learns all 40 lessons to a pass in prerequisite order. The EU AI Act course test was re-run
  alongside it and still passes. Database used: `flashkarte_gdpr_test` on loopback port 55433.
- **Live structure.** `lint_subject` reported no issues. `get_outline` shows 6 modules and 40 lessons, all in
  testing, with the planned prerequisites and reasons.
- **Live read-back.** Every lesson was read back with `get_lesson` and compared with its fixture:
  - lesson title, summary, covers and prerequisites;
  - each screen's text, emphasis, lists, callouts and sources;
  - each question's prompt, every option with its correct flag and reason, the screen references, and every retest.
  - Result: all 40 match on content.
  - The only differences are in the order `get_lesson` lists prerequisites, in P03, R01, R02, R04 and R08. The sets
    and reasons are identical, and `get_outline` lists them in plan order.
  - This comparison was done by reading the two side by side, not by a script diff.

Not done:

- There is no learner walk-through in a browser or on a device.
- There is no legal review.

## Corrections made during import

Each lesson was reviewed before import so that every question and retest makes sense on its own. Fixes went into
the source files first, and the fixtures were rebuilt. Three questions in G05, G06 and R05 were already live when
they were fixed; they were patched in place with `update_question`, and the source was changed to match. The
read-back above confirms that the live course and the local files now agree.

## Maintenance

The live course is the published copy; the files here are its source. To correct a lesson:

1. Edit `lesson_content_m*.py`.
2. Rebuild and validate (see the [README](README.md)).
3. Patch the live item with `update_question` or `update_screen`.
4. Commit both changes together.

If the GDPR is amended, or the status of the EU–US Data Privacy Framework changes, the affected lessons must be
updated. See the [legal baseline](legal-baseline.md) for what was checked and when. Lessons N05 and X05 name these
risks.

## German edition (reference 66)

Deployed 9 October 2026, at Chris's request ("English first, then German").

- Course: **DSGVO-Grundlagen für Unternehmen: personenbezogene Daten, Rechte und Pflichten**.
- Reference: **66**. Subject UUID: `b4dbdb4e-f740-42bf-a514-1f7cad41286b`.
- [Open the course](https://learnwohl.app/learn/b4dbdb4e-f740-42bf-a514-1f7cad41286b).
- It is the `de` edition of the course family `cfaa2f54-cd2c-4dfe-958b-20b9639b6976`. The English course (#65) is the canonical edition. The German edition has the same 73 concepts and 130 edges, with German names, and its own progress.
- Same structure as English: 6 modules, 40 lessons, 227 screens, 146 questions with retests. Lessons stay in **testing**. No `finish_lesson` calls.
- Educational draft, as in English. No lawyer and no native-speaker editor has reviewed it.

### How it was made

- **Sources.** The official German texts of every source were retained and hashed (see the [source register](source-register.md)). EUR-Lex refused automated downloads that day, so they came from the Publications Office repository. All 31 quotations in „…“ are verbatim from those German texts, which `german_validation.py` checks.
- **Translation.** One translator per module followed [translation-guide-de.md](translation-guide-de.md), then an independent reviewer per pair of modules checked meaning, legal terms, retests and German. Dozens of review findings were fixed.
- **Fixes that reached English.** The review found real defects in the English edition, now fixed in both the source and the live course: _Fashion ID_ "jointly" (paragraph 84, not point 2), an AI tool "processed" unlawfully (N03), Article 12(1) misstated (N04), Article 28(3) "in its opinion", references to "Module 3" and "the next lesson", and about 20 retests and answers that relied on context the prompt did not give.

### Verification

Done:

- `german_validation.py` (structure identical to English, quotations verbatim, German source links, no English words, formal address), 28 Python tests, lint, format, typecheck.
- The real-database test creates the `de` edition from the English graph exactly as the service does, imports all 40 German lessons with zero issues and learns them in prerequisite order.
- **Every import call was compared with its fixture by script** (`issues: []` from the server cannot detect a wrong character). This caught one look-alike Cyrillic letter in a German word in G06, which was corrected and re-checked. Later imports sent non-ASCII characters as `\uXXXX` escapes, which rules this out.

Not done:

- No learner walk-through in a browser or on a device.
- No review by a native German speaker or a lawyer.
- The edition picker in the app was not exercised.
