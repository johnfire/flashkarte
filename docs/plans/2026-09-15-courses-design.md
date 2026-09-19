# Courses — Design

_Date: 2026-09-15 · Scope: server + MCP + web + Android · Phase 1 of the
"Duolingo-direction" product shift (see the AI-driven course-builder discussion
in this date's session notes for the fuller context)_

## Goal

Give flashkarte a "course" concept: a user-owned, ordered, gated grouping of
decks, meant to be the container an AI assistant builds into when a user says
"AI, help me learn X" over MCP. A course is the missing structural layer for
"configure what you want to learn" — today an AI can already build one good
deck (proven live this session, twice, grounded in a real textbook), but
nothing groups a multi-deck curriculum into a path with progression.

Deliberately staying BYO-AI (no AI hosted inside flashkarte itself) for this
phase, per the explicit decision to defer an in-app AI advisor — but the
course data model and content-generation workflow are built as a plain
service layer any caller can drive, so an in-app advisor later is "call the
same functions from inside instead of via MCP," not a rewrite.

## Current state (verified 2026-09-15)

- `deck_collections` (migration `020_deck_collections.sql`) exists but doesn't
  fit: official/admin content only, flat browse-order, no per-user rows, no
  gating. Courses are a separate, new concept, not an extension of it.
- `STABLE_REPS = 3` (`packages/shared/src/study/senses.ts`) already means "3
  consecutive non-lapsed reviews" and already gates Spec 10's polysemy
  chain/split phase. Course gating reuses this constant rather than inventing
  a new threshold.
- Depth ladders (`docs/specs/06-depth-ladders.md`, `@concept`/`@depth`
  within-deck gating) is fully speced but unbuilt. Courses give cross-_deck_
  gating without needing it; depth ladders can layer on within a deck later
  without changing anything here.
- The flashkarte MCP server already has deck-authoring tools
  (`create_deck`, `add_cards`, `update_card`, etc.) that this session used
  directly to author real diagnostic content into three production decks —
  living proof of the workflow a course-builder prompt should formalize.

## Data model

- `courses`: `id`, `user_id` (owner), `title`, `description`, `is_public`,
  `created_at`, `updated_at` — same public/private shape decks already use.
- `course_decks`: `course_id`, `deck_id`, `position` — a join table. A deck
  stays a normal deck (still appears in "My Decks", still independently
  studiable) while also being a member of a course; a course is an
  additional ordering layer, not an exclusive container.

## Gating

Deck `i` is unlocked iff deck `i-1` is "mastered": every card in it has
`card_progress.repetitions >= STABLE_REPS`. Deck 0 is always unlocked. An
empty deck counts as vacuously mastered (auto-unlocks the next one) rather
than becoming a dead end. Computed fresh per request from existing
`card_progress` — no new progress table, nothing that can drift out of sync
with real SM-2 state:

```sql
SELECT cd.deck_id, cd.position, d.title,
       count(c.id) AS card_count,
       count(c.id) FILTER (WHERE p.repetitions >= $3) AS mastered_count
FROM course_decks cd
JOIN decks d ON d.id = cd.deck_id
LEFT JOIN cards c ON c.deck_id = d.id
LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
WHERE cd.course_id = $2
GROUP BY cd.deck_id, cd.position, d.title
ORDER BY cd.position
```

`$3` is `STABLE_REPS` bound from `@flashkarte/shared`, not hardcoded, so
course gating and polysemy/depth-ladder stability can never silently drift
apart. The service layer folds over the ordered rows once:
`mastered = card_count === 0 || mastered_count === card_count`,
`locked = !previousDeckMastered`.

## Server API (`packages/server/src/domains/courses/`)

- `POST /api/courses` — create `{title, description?}`
- `GET /api/courses` — list the caller's courses + progress summary
- `GET /api/courses/:id` — ordered decks, each with `{card_count,
mastered_count, locked}`
- `PATCH /api/courses/:id` — rename / set public
- `DELETE /api/courses/:id` — removes the course + `course_decks` rows; member
  decks are untouched
- `POST /api/courses/:id/decks` — append `{deck_id}` (must belong to caller)
- `PATCH /api/courses/:id/decks/reorder` — atomic rewrite, same "must be
  exactly the existing member set" validation `reorderSenses` already uses
- `DELETE /api/courses/:id/decks/:deckId` — detach
- Public browsing + `POST /api/library/courses/:id/clone` under the library
  domain — clone every member deck (existing per-deck clone logic, called
  once per deck) into the caller's account, recreate `course_decks` pointing
  at the clones in the same order. Gating starts fresh at deck 0: progress is
  per-user and never copied, only structure is.

Auth: only the owner can create/edit/reorder/delete a course's structure; a
public course is readable (browsing/cloning) but not editable by anyone else.

## MCP tools + the course-builder prompt

New tools, same style as the existing deck tools: `create_course`,
`list_courses`, `get_course`, `update_course`, `add_deck_to_course`,
`reorder_course_decks`, `remove_deck_from_course`, `delete_course`.
`create_deck` gains an optional `course_id` so a multi-unit course can be
built deck-by-deck in one call each, not create-then-attach every time.

The centerpiece: an MCP **prompt** (a distinct primitive from tools — a
compatible client can list and inject it automatically, no copy-pasting)
named `build-a-course`, walking the connected AI through:

1. Clarify the learner's actual goal, current level, and how much material is
   reasonable.
2. Ground it in real sources — ask what the user already has, or find/read
   real material; don't fabricate facts (today's session, reading the actual
   Art of Electronics chapter before writing cards, is the model).
3. Break the goal into an ordered sequence of right-sized decks, created via
   `create_course` then `create_deck` with `course_id` for each, in order.
4. Within each deck: plain front/back for straightforward facts, diagnostic/MC
   for genuine points of confusion, sense blocks for multi-meaning terms —
   not everything needs to be fancy.
5. Review the finished structure with the user before finishing.

Deliberately not mentioning depth ladders (`@concept`/`@depth`) — unbuilt, and
an AI writing those tags today would corrupt card content, since the parser
doesn't recognize them yet.

## Android & web UI

**Web:** `/courses` list (parallel to "My Decks," linked from the main nav);
`/courses/:id` detail — ordered decks with a lock icon + `mastered/total`
progress; an unlocked deck's row links straight into the existing StudyPage
unchanged, a locked one is inert with a "Finish [previous deck] to unlock"
note. Create/edit is a small form matching `CreateDeckPage`. Public course
browsing sits alongside the existing deck Library, with a preview (title,
description, ordered deck titles + card counts, not full card content)
before cloning, mirroring `/public/library/:id/preview`.

**Android:** the same two screens (Compose + ViewModel), following the
existing deck-list/deck-detail conventions — the single largest chunk of new
work in the feature, since it's two screens built from scratch, not a port.

**Study itself is unchanged** — a deck inside a course studies exactly like
any other deck (same Study screen, same SM-2, same diagnostic/Choice-mode
work from earlier today). Courses only add the "which decks are visible/
unlocked, and in what order" layer on top.

## Testing

**Server:** gating (empty-deck vacuous mastery, one unmastered card locks the
next deck, all-stable unlocks it, single-deck course trivially unlocked);
ownership (can't add another user's deck, can't edit someone else's private
course); reorder validation; clone (clones every member deck, preserves
order, clone's gating starts fresh).

**MCP:** new tools' input validation, `create_deck` + `course_id`
combination, `build-a-course` prompt is discoverable and non-empty.

**Web:** locked/unlocked/progress rendering, mocked-`api` pattern; one flow
test for clone → lands on the new course's detail page.

**Android:** ViewModel tests for both new screens, matching existing
`StudyViewModel`-style conventions.

No parser/corpus work anywhere in this feature — courses are structured via
API/MCP calls, not authored Markdown.

## Rollout — four sequenced phases, each its own commit(s), pushed and

CI-green before the next starts

1. **Migration + server domain + gating** — usable immediately via direct
   API/MCP calls even with no UI yet.
2. **MCP tools + the `build-a-course` prompt** — the point where "AI, help me
   learn X" actually works end-to-end, before any client UI exists.
3. **Web UI.**
4. **Android UI.**

v1 isn't "done" until phase 4 lands, but phase 2 is the earliest point where
the actual feature is usable, from your own AI assistant, today.
