# Library content languages — proposal and build plan

_Date: 2026-09-27 · Status: draft for discussion; implementation has not started._

## Goal

A learner can choose **All**, **Deutsch**, **English**, or **العربية** in the
Library and see courses and flashcard decks whose teaching material uses that
language. This choice is about the content, independent of the language of the
Flashkarte interface. A course teaching German with Arabic explanations belongs
under Arabic. The language being taught can be described separately later.

## Current state

- `/library` contains official/community structured courses and official/community
  flashcard decks. Both deck sections also contain deck collections.
- Course editions already have `subjects.locale`, but only courses assigned to a
  `course_family` have it. The subject catalogue omits this field from its
  response and does not filter by it.
- Standalone decks, official deck collections, and community deck collections
  have no catalogue content-language field. Deck speech languages describe how
  each side is pronounced; they cannot reliably classify the whole deck.
- Browse endpoints for decks and collections paginate. Filtering a fetched page
  in the browser would miss matching items on later pages.
- The app interface currently supports English, German, French, and Spanish;
  Arabic content does not require an Arabic interface translation.

## Recommendation

1. Put a compact, accessible language switcher above the Library sections.
   Use native labels so a learner can recognize their language regardless of
   interface locale. Show the selected choice clearly. Keep **All** as the
   initial choice so existing content remains discoverable while metadata is
   assigned.
2. Treat `en`, `de`, and `ar` as canonical content-language codes. Store one
   primary language per published catalogue item. Store it on structured
   courses, individual decks, official deck collections, and community deck
   collections. A collection's language describes its presentation as a whole;
   it is assigned explicitly rather than inferred from a member deck.
3. Filter on the server before pagination and preserve the choice in the URL,
   for example `/library?language=ar`. Carry it through links to the four
   browse pages and back navigation. A copied link should open the same view.
4. Show a small language label on cards and detail pages. Include a clear
   empty state such as “No Arabic courses yet” and a route back to All.
5. Keep course/deck ownership and source as the existing Library sections.
   Language is a filter across them, so selecting Arabic shows Arabic official
   courses, official decks, community courses, and community decks together.

### Why a metadata field

The title, category, UI language, and deck speech settings each answer a
different question. None reliably tells us what language explains the item to
the learner. Explicit metadata also lets the database filter accurately as
the catalogue grows.

## Build slices

### 1. Catalogue data and assignment

- Add a content-language value to published decks and the two collection
  models. Use the existing `subjects.locale` for structured courses, including
  standalone subjects outside a course family. Define one shared set of
  supported codes and validation for catalogue writes and filter requests.
- Provide owner/admin ways to set or correct the value when authoring or
  publishing. Carry the value through import, clone, and edition workflows
  where the new item clearly inherits the original content language.
- Audit existing published items and assign language by reviewing their actual
  teaching content. Do not infer it from titles, categories, UI settings, or
  speech settings. Keep unreviewed items visible under All until assigned;
  decide the publication rule for future unlabelled items before release.
- Record language changes in the existing audit trail. Add indexes only where
  query plans show they help the filtered browse paths.

### 2. Catalogue APIs

- Return the content language in all course, deck, and collection summary and
  detail responses. Accept an optional `language` query parameter in the four
  Library data sources: structured subjects, official decks/collections,
  community decks, and public deck collections.
- Apply the filter in SQL before `LIMIT`/`OFFSET`. Compose it with existing
  search and category filters. Keep responses unchanged when the parameter is
  absent. Reject unsupported language values instead of silently showing All.
- Ensure a collection result is selected by its own language and that its
  member list remains intact when opened. Preserve language metadata when a
  deck or community collection is cloned.

### 3. Web Library

- Build one reusable language switcher for `/library` and its browse pages.
  Use query parameters, keyboard focus, active-state semantics, and mobile
  wrapping. Keep the choice when navigating between Library views.
- Pass the selected language to each section's API request, show the language
  label on items, and provide language-specific empty states. Keep the current
  official/community and courses/decks organization.
- Do not couple this filter to the profile UI-language setting. An English UI
  user must still be able to browse Arabic and German content.

### 4. Verification and release

- Server unit and real-Postgres integration tests: validation, SQL filtering
  before pagination, combinations with search/category, null metadata,
  course editions, collection membership, and clone inheritance.
- Web component and Playwright coverage: switching languages across all four
  sections, direct URL and back navigation, empty state, small screen, keyboard
  access, and Arabic labels without changing the whole page direction.
- Run focused tests, typecheck, lint, format check, and relevant builds. Commit
  the implementation on `main`; push only when Chris requests it.

## Decisions to settle before implementation

1. **Scope:** should the same switcher also filter personal “My Courses” and
   “My Decks” views? This proposal starts with Library discovery.
2. **Future languages:** should authors be able to use any valid BCP-47 code,
   or should catalogue languages be restricted to `en`, `de`, and `ar` until
   more content exists? The first version above uses the three known codes.
3. **Publication rule:** after existing content is labelled, require a language
   before new content becomes public, or permit “Unspecified” under All. A
   required value gives cleaner filtering; an unspecified state eases migration.
4. **Mixed-language collections:** if the instructions are mostly Arabic but
   cards contain German examples, label the collection Arabic. If a collection
   has genuinely mixed teaching languages, decide whether to split it or offer
   multiple language tags in a later iteration.
