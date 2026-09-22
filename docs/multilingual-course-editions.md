# Multilingual structured learning course editions

_Status: current design for structured learning courses. This does not apply to flashcard decks or flashcard deck collections._

## Purpose

Flashkarte can host a library of structured learning courses in several languages without treating a translation as an unrelated
course. A **course family** has one canonical subject and one or more locale-specific subject editions.
The canonical edition is the source of truth for the concept graph; each edition holds learner-facing content
and progress in its own language.

This design starts with English and German for `AI Literacy`, and is deliberately open to further BCP-47 locales
such as `fr`, `es`, or `pt-BR`.

## Model

```
course family
├── canonical subject (locale: en)
│   ├── concepts and prerequisite graph
│   ├── English modules, lessons, screens, and questions
│   └── diagrams
└── localized subject edition (locale: de)
    ├── same stable concept slugs and prerequisite graph
    ├── German modules, lessons, screens, and questions
    └── references shared diagrams when they contain no language
```

The database adds `course_families` and attaches an optional `course_family_id` plus `locale` to `subjects`.
Subjects created before this feature remain valid standalone subjects. A family has exactly one canonical
subject and at most one edition for each locale.

## Content and progress rules

- A translated edition copies the canonical concepts' **slugs**, kinds, tiers, authoring order, and edges.
  It supplies a localized display name for every concept.
- Modules and lessons are authored per edition, using the same lesson slugs where they express the same learning
  unit. This lets tools compare editions and later detect translation drift.
- Learner progress is intentionally per edition. Reading an English lesson does not mark its German translation
  read: each is a real learning experience and must preserve its own text and question history.
- A learner selects an edition before beginning. The application must never silently mix languages. If the chosen
  locale does not exist, it should offer the canonical/default edition explicitly.

## Shared graphics

An asset remains stored under the subject in which it was created, but every edition in the same course family
may list and serve it. This keeps a language-neutral SVG (for example a neural-network topology) as one durable
asset rather than many copies.

- Share diagrams only when they contain no language-specific text.
- Put captions and alt text in the localized screen block, never solely inside the SVG.
- Diagrams with labels need a localized variant, or a text-free base graphic plus localized labels in the lesson.
- Deleting an asset must eventually check references across all editions; until that cross-edition protection is
  implemented, authors should treat shared diagrams as durable course assets.

## Authoring workflow

1. Create and review the canonical subject graph.
2. Call `create_course_family` with its locale, normally `en`.
3. Call `create_localized_edition` with the target locale, localized title/description, and one localized concept
   name for every canonical slug.
4. Author modules and lessons in the canonical edition, then author their translations in each localized edition.
5. Use `list_course_editions` to see the editions that exist. A later drift checker should compare lesson slugs,
   graph revision, and translation review status.

## API and MCP surface

| Operation                               | HTTP                                   | MCP                        |
| --------------------------------------- | -------------------------------------- | -------------------------- |
| Promote a subject to a canonical course | `POST /api/subjects/:id/course-family` | `create_course_family`     |
| Create a localized graph edition        | `POST /api/subjects/:id/editions`      | `create_localized_edition` |
| List available editions                 | `GET /api/subjects/:id/editions`       | `list_course_editions`     |

Every mutating route is audit logged. The MCP tools use the caller's authoring key, so localized content retains
its AI or human attribution.

## Rollout

1. Deploy the schema and API/MCP foundation.
2. Promote the existing English `AI Literacy` subject to the canonical `en` edition.
3. Create its `de` edition from the approved graph, then author and review localized lessons.
4. Add the learner-facing edition picker and explicit fallback UI before publishing multilingual courses.
5. Add translation-drift reporting and cross-edition asset-delete protection before scaling beyond the pilot.

## Non-goals of this first slice

- Automatic translation or claims that a machine translation has been pedagogically reviewed.
- Shared learner progress across languages.
- Automatic UI-language switching of an in-progress course.
- Localized SVG text rewriting.
