# EU AI Act course — source and graph review

Checked 6 October 2026. **Stage 1 review draft.** No subject, lessons or translated editions have been imported into Flashkarte by this stage. No publication is authorised.

The first instalment contains **52 lessons in eight modules**, teaching **109 concepts** through **150 required links and 28 supporting links**. The source coverage register contains **141 planned rows**. English is canonical; German and Czech follow first. All three editions will share stable concept identities and matching assessments.

Start with the [lesson outline](lesson-outline.md), then review the [concept graph and every edge reason](concept-graph.md). The [coverage table](coverage.md) shows which provision each lesson will address. The [legal baseline](legal-baseline.md), [source register](source-register.md) and [glossary seed](glossary.md) provide the evidence and translation constraints.

Chris's presentation informed the [slide review and case bank](presentation-review.md). The next dedicated block is **Article 50**, approved in chat on 6 October; its [follow-on outline](programme-roadmap.md) preserves the agreed introduction → Article 6 → Article 5 sequence. The [programme inventory](programme-inventory.json) assigns all 119 article identifiers and 14 annexes in this baseline to future teaching blocks; paragraph-level work for those blocks remains to be done.

## Decisions to review

- Are the `requires` links necessary to understand each concept, or merely helpful? Supporting context belongs under `suggests`.
- Do the product, platform, exception and prohibition capstones draw on the right earlier concepts? Each concept has at most four required parents; a lesson teaching several concepts can have a larger combined prerequisite set. B12 combines six earlier lessons and merits particular attention for learner load.
- Are the two extensions, P06 and R04, appropriately optional? Neither gates the core path.
- Is the mixed professional audience served by both everyday cases and precise legal tests, without assuming a law degree?

The agreed plan places this graph review before lesson authoring. Once the graph is accepted, the next work is **the eight English introductory lessons**, one module in testing, followed by German and Czech editions. Before drafting each lesson, read its outstanding guideline or incorporated-law sources, verify its terminology and record any unresolved interpretation. Every screen needs a source; every covered concept needs an assessment and explanations for all answer options. Owner learning review and specialist legal review remain separate.

## Checks and boundaries

The structural validator checks identifiers, single coverage of concepts, taught order, cycles, maximum required parents, extension/core separation, derived prerequisites, critical amended provisions, all Annex III points and retained source hashes. Its tests include deliberately damaged graphs and source files. These checks establish internal consistency, not legal correctness or Flashkarte import validity.

Run from the repository root:

```bash
python docs/courses/eu-ai-act/curriculum_validation.py
python -m unittest discover -s docs/courses/eu-ai-act -p 'test_*.py'
python docs/courses/eu-ai-act/render_review.py --check
```

The JSON registers are canonical. Regenerate the four review tables with `render_review.py` after editing them. The supporting narrative documents require their own review. Retained official PDFs are identified and hashed in the source register; user screenshots and browser details are not copied into this package.
