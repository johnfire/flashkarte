# Library content languages — proposal and build plan

_Date: 2026-09-27 · Status: implemented locally; awaiting push and deployment._

## Goal

A learner can choose **All**, **Deutsch**, **English**, or **العربية** in the
Library, My Courses, and My Decks and see items whose teaching material uses
that language. Each page remembers its own choice for that user. The filter is
about the content, independent of the language of the Flashkarte interface. A
course teaching German with Arabic explanations belongs under Arabic. The
language being taught can be described separately later.

## State before implementation

- `/library` contains official/community structured courses and official/community
  flashcard decks. Both deck sections also contain deck collections.
- `/learn` is the My Courses page and `/` is My Decks. Their lists were
  loaded without a content-language filter. `/courses` is a legacy
  overview that remains available for older bookmarks.
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

1. Put a compact, accessible language switcher above the Library sections and
   on My Courses and My Decks.
   Use native labels so a learner can recognize their language regardless of
   interface locale. Show the selected choice clearly. One language is active
   at a time; **All** shows everything, including unlabelled older items.
   Start each page at All until the user chooses otherwise.
2. Treat `en`, `de`, and `ar` as canonical content-language codes. Store one
   primary language per item, including private items in My Courses and My
   Decks. Store it on structured courses, individual decks, official deck
   collections, and community deck collections. A collection's language
   describes its presentation as a whole; it is assigned explicitly rather
   than inferred from a member deck.
3. Filter on the server before pagination and preserve the choice in the URL,
   for example `/library?language=ar`. Carry it through links to the four
   browse pages and back navigation. A copied link should open the same view.
4. Remember **three independent choices per account**: Library, My Courses,
   and My Decks. Changing one must not change either of the others. An explicit
   language in a URL wins for that visit (`language=all` explicitly selects
   All); choosing a button saves that page's new preference. On a page URL
   without a language parameter, use its saved preference. This keeps choices
   consistent across devices without mixing them with the account's
   interface-language setting.
5. Show a small language label on cards and detail pages. Include a clear
   empty state such as “No Arabic courses yet” and a route back to All.
6. Keep course/deck ownership and source as the existing Library sections.
   Language is a filter across them, so selecting Arabic shows Arabic official
   courses, official decks, community courses, and community decks together.
   On personal pages the switcher changes only visible list items; progress,
   review counts, and saved learning state remain unchanged.

### Why a metadata field

The title, category, UI language, and deck speech settings each answer a
different question. None reliably tells us what language explains the item to
the learner. Explicit metadata also lets the database filter accurately as
the catalogue grows.

## Build slices

### 1. Catalogue data and assignment

- Add a content-language value to decks and the two collection
  models. Use the existing `subjects.locale` for structured courses, including
  standalone subjects outside a course family. Define one shared set of
  supported codes and validation for catalogue writes and filter requests.
- Provide owner/admin ways to set or correct the value when authoring,
  editing, or publishing. Carry the value through import, clone, and edition
  workflows where the new item clearly inherits the original content language.
- Audit existing published items and assign language by reviewing their actual
  teaching content. Do not infer it from titles, categories, UI settings, or
  speech settings. Keep unreviewed items visible under All until assigned;
  decide the publication rule for future unlabelled items before release.
- Record language changes in the existing audit trail. Add indexes only where
  query plans show they help the filtered browse paths.
- Add account-scoped saved filter preferences for Library, My Courses, and My
  Decks, with All as the default. Keep these distinct from `users.language`,
  which controls the interface.

### 2. Catalogue APIs

- Return the content language in all course, deck, and collection summary and
  detail responses. Accept an optional `language` query parameter in the four
  Library data sources: structured subjects, official decks/collections,
  community decks, and public deck collections.
- Apply the filter in SQL before `LIMIT`/`OFFSET`. Compose it with existing
  search and category filters. Keep responses unchanged when the parameter is
  absent. Reject unsupported language values instead of silently showing All.
- Make the category tree's official/community item counts use the selected
  language too, so a German category count does not include Arabic items or
  expose empty categories as if they had matches.
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

### 4. Personal courses and decks

- Add the same switcher to `/learn` and `/`. Each reads and updates only its
  own saved account preference; page links may carry an explicit language
  parameter without changing another page's choice.
- Return content language in the existing owned/enrolled subject, owned deck,
  and subscribed deck list responses. Filter those currently unpaginated lists
  on the client; keep the full list and study counts available so changing
  language is immediate and does not alter review calculations.
- Show a distinct “No items in this language” state, with an All button, when
  a filtered list is empty. Apply the My Courses preference to the legacy
  `/courses` overview as long as that route remains accessible.
- When a personal list is filtered, show how many items are hidden by that
  choice, so a learner can tell that other decks or courses still exist.

### 5. Verification and release

- Server unit and real-Postgres integration tests: validation, SQL filtering
  before pagination, combinations with search/category, null metadata,
  course editions, collection membership, and clone inheritance.
- Web component and Playwright coverage: switching languages across all four
  Library sections and both personal pages; independent account preferences;
  direct URL and back navigation; empty state; small screen; keyboard access;
  and Arabic labels without changing the whole page direction.
- Run focused tests, typecheck, lint, format check, and relevant builds. Commit
  the implementation on `main`; push only when Chris requests it.

## Future extensions

1. **Future languages:** extend the three supported choices when new teaching
   languages are added to the catalogue.
2. **Mixed-language collections:** if the instructions are mostly Arabic but
   cards contain German examples, label the collection Arabic. If a collection
   has genuinely mixed teaching languages, decide whether to split it or offer
   multiple language tags in a later iteration.

## Decisions already made

- Language means the language used to explain the material. A German course
  explained in Arabic is Arabic for this filter.
- The switcher belongs on Library, My Courses, and My Decks.
- A page selects one language at a time, with All as an option. Its selection
  stays separate from the other pages' selections.
- Newly published courses and decks require an explanation language. Existing
  items with uncertain language remain under All until an author assigns one.
- The first release supports English, German, and Arabic. The migration
  classifies clear existing content after inspecting lesson summaries and card
  backs; the Smoke Test deck remains unlabelled.
