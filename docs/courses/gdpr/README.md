# GDPR Basics for Business — English first release

Built 7–8 October 2026 from the [course plan](../../plans/2026-10-07-gdpr-basics-course.md). The course is shared
to the Community library as **reference 65**. It is an **educational draft**: it is not legal advice, and no lawyer
has reviewed it yet. See the [deployment record](deployment.md) for the live identifiers and how it was verified.

## Who it is for

The course is for business people who are not experts in computers or data management. It uses one fictional
running example, **Sunfield Bakery**, and plain language. Legal terms are explained in plain words.

## Shape

- **40 lessons in 6 modules**: 33 core lessons and 7 optional extension lessons.
- **73 concepts**, linked by 113 `requires` edges and 17 `suggests` edges.
- **227 sourced screens** and **146 multiple-choice questions**. Each question has an explanation for every option
  and a reworded retest.

| Module | Title                                                 | Lessons                   |
| ------ | ----------------------------------------------------- | ------------------------- |
| M0     | Start here: what the GDPR covers                      | G01–G06                   |
| M1     | The rules for using personal data                     | P01–P08                   |
| M2     | People's rights: what customers and staff can ask for | R01–R08                   |
| M3     | What your organisation must do                        | O01–O08 (O08 is capstone) |
| M4     | Borders, regulators and fines                         | X01–X03, plus X04–X05 ext |
| M5     | Beyond the basics (all extension)                     | N01–N05                   |

No core lesson depends on an extension lesson. The [concept graph](concept-graph.md) lists every edge with its
reason.

## Legal scope

The [legal baseline](legal-baseline.md) sets the scope: the GDPR as in force on 7 October 2026, plus the
neighbouring instruments and court cases used in the extension lessons. The [source register](source-register.md)
lists the retained EUR-Lex files with their SHA-256 hashes. The German BDSG and TDDDG are out of scope by Chris's
decision and are candidates for two small separate courses.

## Files

| File                             | Role                                                                   |
| -------------------------------- | ---------------------------------------------------------------------- |
| `curriculum_plan.py`             | Modules, lessons, concepts, edges. Writes `curriculum.json` and graph. |
| `curriculum_validation.py`       | Graph checks: cycles, parents, extension/core separation, order.       |
| `lesson_content_m0.py` … `m5.py` | The authored screens and questions.                                    |
| `lesson_builder.py`              | Builds `lessons/en/*.json` and `subject-import.json`.                  |
| `lesson_validation.py`           | Per-lesson and whole-course checks on the fixtures.                    |
| `sources.py`                     | Source list. Writes `source-register.md`.                              |
| `test_gdpr_course.py`            | Damages the course on purpose and checks the validators reject it.     |

After editing content, rebuild and check from this directory:

```bash
python3 curriculum_plan.py
python3 lesson_builder.py
python3 curriculum_validation.py
python3 lesson_validation.py
python3 -m unittest discover -s . -p 'test_*.py'
```

CI runs the validators and the tests (step "Validate GDPR Basics course package"). The server integration test
`packages/server/src/domains/learn/gdpr-course.integration.test.ts` imports every fixture into a real Postgres
database and learns the whole course in prerequisite order.

A change to the local files does **not** change the live course. Live lessons are corrected with the learnwohl MCP
tools (`update_question`, `update_screen`), and the matching source file must be changed in the same step.

## Next

1. German edition.
2. Legal review by a qualified person, after which the "educational draft" label can be reconsidered.
3. Optional small courses on the BDSG and the TDDDG.
