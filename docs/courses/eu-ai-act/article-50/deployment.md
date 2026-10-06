# English Article 50 course deployment

Imported and verified 6 October 2026. Chris approved the concept graph and syllabus and requested continuing all three modules so the course could be tested as a whole.

- **EU AI Act: Article 50 Transparency in Practice**, reference **62**.
- [Open the course](https://learnwohl.app/learn/21641dae-9fed-4be5-bda7-7123967c4067).
- Subject UUID: `21641dae-9fed-4be5-bda7-7123967c4067`.
- English; three modules, 18 lessons, 42 concepts and 80 concept edges.
- 85 sourced screens, 55 primary questions and 55 equivalent retests, with explanations for all answer options.
- All 18 lessons are AI-authored and remain in **testing**. No `finish_lesson` call was made.
- Live visibility: private to the owner, not official. Community sharing has not been applied to this course.

This extends the programme beyond the earlier 52-lesson English foundations course. It is a learning draft for owner review. No specialist legal approval or comprehensive implementation certification is claimed. The 48-row coverage ledger remains a target register; authored fixtures and verified imports are separate evidence.

## Content and source checks

The lessons distinguish binding amended law, non-binding Commission interpretation and voluntary Code methods. They cover the four Article 50 activity types, timing and accessibility, distinct law-enforcement exceptions, the targeted marking transition, technical qualities, downstream responsibilities, creative-work disclosure and the two-part editorial exception. Each module ends in a fictional case.

Source checking corrected the older plan's Article 50(7) actor from AI Office to Commission and corrected paragraph locators against the final Guidelines. The text law-enforcement target is assigned to T17, where it is taught. The final case includes lookup pointers for separate prohibitions, high-risk notification, complaints and enforcement; those pointers do not teach all incorporated laws.

The [parent source register](../source-register.md) retains official sources and actual reading limits. The baseline is the 27 July 2026 consolidation. Dates and interpretative material need rechecking when the course is revised.

## Verification

The isolated Postgres 16 test database `flashkarte_article50_test` used loopback port 55433, separate from application data. The test:

1. Imports all 18 fixtures with zero issues and verifies testing stage.
2. Checks three modules, 18 lessons and a locked final case before learning.
3. Deliberately answers a real T01 question incorrectly, verifies remediation and a different retest presentation and prompt.
4. Learns every lesson in prerequisite order and confirms all 18 end passed.

The initial enhanced test failed because it started T01 for the wrong-answer check and subsequently expected that lesson's access to remain `available`; the actual access was correctly `in_progress`. Moving the wrong-answer exercise after the availability assertion corrected the test sequence. All lock, remediation, retest and completion checks were retained; the final test passed. No failing test was removed, skipped or weakened.

Live MCP readback verified all 18 lessons against the fixtures, including text and emphasis, sources, coverage, questions, every option and explanation, remediation screen numbers and variants. The complete prerequisite sets and reasons matched both lesson readback and the live outline. The concept graph and all edge reasons matched; subject and lesson lints were empty. [Structured verification](live-verification.json) records the counts and comparison results.

Local checks passed: all course validators, both generated-review checks, **43 Python regression tests**, the complete Article 50 Postgres integration test, server typecheck, root lint and formatting check. There was no browser visual review or physical-device test; owner use will test clarity and usefulness.

The content import is already live through MCP. Repository changes are committed locally and are not pushed; CI has not run for this commit. No application deployment was needed.
