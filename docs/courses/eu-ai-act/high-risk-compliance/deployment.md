# English high-risk course deployment

Imported and verified 7 October 2026. Chris approved the graph and outline, then requested all 30 lessons and being the first student. That instruction changed the earlier six-lesson first batch to the whole course.

- **EU AI Act: High-risk compliance in practice**, reference **63**.
- [Start the course](https://learnwohl.app/learn/9bac2ab8-108d-4493-96f6-ac9184163981).
- English; five modules, 30 lessons, 78 concepts, 127 concept edges.
- 131 sourced screens, 90 primary questions and 90 equivalent retests.
- Each answer option has an explanation and each question has teaching-screen remediation.
- All lessons remain AI-authored **testing** drafts, private to Chris and not official.
- No lesson was finished and no owner learner session was started. Live owner progress was **not_started** at verification.

Start at H01 and work through available lessons. Five module cases develop a fictional recruitment-system dossier. H29 is an optional biometric extension; H30 remains reachable without it. Record unclear wording, missing explanations and cases that do not support your own product decisions. The course can be revised from that feedback.

## What was verified

Live MCP readback compared every lesson with its authored fixture, including text and emphasis, source titles/links, coverage, questions, every option and explanation, remediation references and retest variants. All prerequisite sets and reasons matched both lesson readback and the course outline. The complete graph matched the approved import, with no subject or lesson lint issues. [Structured results](live-verification.json) contain counts and comparison findings.

The first temporary readback comparison assumed screen numbers restarted for each lesson. The service numbers screens across the subject. Mapping each local teaching reference to its actual returned screen number corrected the verifier; every remediation reference was then compared exactly. No learner assertion was removed or weakened.

An isolated Postgres 16 database, separate from application data, tested the course with a synthetic learner:

1. Imported all 30 fixtures with zero issues and testing stage.
2. Verified five modules, 30 lessons and H30 initially locked.
3. Deliberately missed an H01 question, checked remediation and a different retest presentation and prompt.
4. Completed the core route before H29, proving the optional extension did not lock H30.
5. Completed all 30 lessons and confirmed each was passed.

Local validation passed: **50 Python regression tests**, authored-fixture/curriculum validation, the full-course Postgres integration test, server typecheck, root lint and formatting checks. Existing ts-jest warnings about compiling shared JavaScript with allowJs disabled did not fail the integration test. No browser visual review or physical-device test was performed. These checks establish import and learning-path behaviour; Chris's use will test teaching clarity and usefulness.

## Source and release limits

The lessons use the amended 27 July 2026 baseline, with individual duty dates and transitions. [Source checks](source-checks.md) record authority and actual reading limits. Conditional accessibility, data-law, national/sector and template checks remain explicit. Detailed conformity procedures and incident-reporting deadlines belong to later course parts.

The import is live content. Repository changes are committed locally and are not pushed; CI has not run for this commit. No application deployment was needed. This learning draft is not specialist legal approval or a certificate of product compliance.
