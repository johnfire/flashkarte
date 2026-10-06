# English EU AI Act course deployment

Deployed 6 October 2026. Chris authorised building and deploying the saved plan and explicitly selected **all 52 English lessons**. The course is shared to the live Community library.

- Course: **EU AI Act: Foundations, High-Risk Classification and Prohibited Practices**.
- Reference: **61**.
- Subject UUID: `2b2131c9-f8f8-484f-a1c5-638294a63794`.
- [Open the course](https://learnwohl.app/learn/2b2131c9-f8f8-484f-a1c5-638294a63794).
- Language: English; eight modules, 52 lessons, 109 concepts and 178 graph edges.
- Content: 208 sourced reading screens, 156 primary questions and 156 equivalent retests, with an explanation for each answer option.
- Live visibility verified with `get_subject`: `is_public: true`, `is_official: false`, `locale: en`. Community sharing completed at `2026-10-06T11:27:29.473Z`.

All lessons stay in **testing** and are recorded as AI-authored. They are available for learning and review, with corrections still possible. No `finish_lesson` calls were made. This is an educational draft; no specialist legal reviewer or specialist legal approval is claimed. German, Czech, the dedicated Article 50 block and full downstream high-risk compliance teaching are follow-on work.

## Verification

The isolated Postgres integration test imported every fixture with **zero issues**, confirmed eight modules, and learned all 52 lessons to a pass in prerequisite order. Python tests deliberately damage coverage, questions, screen references, retests, sources and prerequisites to confirm that incomplete content is rejected.

Live verification read **every lesson back** after import and compared screen text, sources, concept coverage, question prompts, every option and reason, remediation screen references and all retests with the local fixtures. There were no differences. The live outline's full prerequisite sets match the plan; the live graph's concepts, edges and reasons match the approved graph. Subject and lesson lints reported zero issues.

Checks completed locally:

```bash
python docs/courses/eu-ai-act/curriculum_validation.py
python docs/courses/eu-ai-act/lesson_validation.py
python -m unittest discover -s docs/courses/eu-ai-act -p 'test_*.py'
python docs/courses/eu-ai-act/render_review.py --check
npm run lint
npm run typecheck --workspace=packages/server
npm run format:check
```

The course Python suite passed 28 tests. The dedicated real-database test is `packages/server/src/domains/learn/eu-ai-act-course.integration.test.ts`; it passed with `POSTGRES_DB=flashkarte_ai_act_test`, a separate Postgres 16 container on loopback port 55432. Its initial sandboxed attempt failed with `connect EPERM 127.0.0.1:55432`; rerunning with permission to reach the isolated database passed. No tests were removed or weakened.

The public course route returned the LearnWohl application successfully. No browser surface was available for a visual live learner check; runtime progression was tested against real Postgres, and deployed content/visibility was verified through the live MCP service. This record does not claim browser or physical-device testing.

## Sources and maintenance

The course uses the 27 July 2026 consolidated baseline. The original entry-into-force date was corrected from the saved plan's 2 August to **1 August 2024**. The [source register](source-register.md) retains official PDFs and hashes; the [legal baseline](legal-baseline.md) records actual reading limits and remaining review. Fictional sector cases explicitly stipulate coverage and assessment-route facts. Unspecified national-law permission/defence questions are left unresolved.

`lesson_builder.py` builds the fixtures from the eight authored module files. `lesson_validation.py` checks fixture consistency, coverage, sources, assessments and import order. The existing CI course-review step now checks the English fixtures, and the server integration suite includes the complete-course test.

Publication is a live **content deployment through MCP**. It does not require an application-image deployment or Git push. The repository changes are committed locally; CI has not run for that unpushed commit.
