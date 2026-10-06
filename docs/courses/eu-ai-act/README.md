# EU AI Act course — English first release

Checked 6 October 2026. Chris approved building and deploying **all 52 English lessons** from the saved graph and syllabus. The English content is an editable educational draft; owner learning review and specialist legal review remain separate. German, Czech and the dedicated Article 50 block are follow-on work.

The first instalment contains **52 lessons in eight modules**, teaching **109 concepts** through **150 required links and 28 supporting links**. The source coverage register contains **141 planned rows**. English is canonical; German and Czech follow first. All three editions will share stable concept identities and matching assessments.

Start with the [lesson outline](lesson-outline.md), then review the [concept graph and every edge reason](concept-graph.md). The [coverage table](coverage.md) shows which provision each lesson will address. The [legal baseline](legal-baseline.md), [source register](source-register.md) and [glossary seed](glossary.md) provide the evidence and translation constraints.

Chris's presentation informed the [slide review and case bank](presentation-review.md). The next dedicated block is **Article 50**, approved in chat on 6 October; its [follow-on outline](programme-roadmap.md) preserves the agreed introduction → Article 6 → Article 5 sequence. The [programme inventory](programme-inventory.json) assigns all 119 article identifiers and 14 annexes in this baseline to future teaching blocks; paragraph-level work for those blocks remains to be done.

## Review points

- Are the `requires` links necessary to understand each concept, or merely helpful? Supporting context belongs under `suggests`.
- Do the product, platform, exception and prohibition capstones draw on the right earlier concepts? Each concept has at most four required parents; a lesson teaching several concepts can have a larger combined prerequisite set. B12 combines six earlier lessons and merits particular attention for learner load.
- Are the two extensions, P06 and R04, appropriately optional? Neither gates the core path.
- Is the mixed professional audience served by both everyday cases and precise legal tests, without assuming a law degree?

The approved first release contains 208 sourced reading screens, 156 primary questions and 156 equivalent retests. Every concept is taught once and assessed, with explanations for every choice. The [English fixtures](lessons/en/) are built from `lesson_content_m0.py` through `lesson_content_m7.py` by `lesson_builder.py`. `subject-import.json` maps the plan to the actual MCP graph schema. See the [deployment record](deployment.md) for live identifiers and verified status.

## Checks and boundaries

The structural validator checks identifiers, single coverage of concepts, taught order, cycles, maximum required parents, extension/core separation, derived prerequisites, critical amended provisions, all Annex III points and retained source hashes. Its tests include deliberately damaged graphs and source files. These checks establish internal consistency, not legal correctness or Flashkarte import validity.

Run from the repository root:

```bash
python docs/courses/eu-ai-act/curriculum_validation.py
python docs/courses/eu-ai-act/lesson_validation.py
python -m unittest discover -s docs/courses/eu-ai-act -p 'test_*.py'
python docs/courses/eu-ai-act/render_review.py --check
```

The JSON registers are canonical. Regenerate the four review tables with `render_review.py` after editing them. The supporting narrative documents require their own review. Retained official PDFs are identified and hashed in the source register; user screenshots and browser details are not copied into this package.

The server integration test `eu-ai-act-course.integration.test.ts` imports all 52 fixtures into an isolated real Postgres database, requires zero lesson issues and walks the full learning path. Source-reading limits, stipulated sector-case facts and unresolved national-law questions are documented in the legal baseline and source register. Lessons remain in `testing`, where review corrections can be made.
