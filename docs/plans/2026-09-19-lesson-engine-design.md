# Lesson engine — Design spec (DRAFT)

_Date: 2026-09-19 · Status: **draft for Chris to review at the computer. Nothing here is built.**
Decisions marked **Decided** came from Chris in conversation on 2026-09-19; everything marked
**Open** is waiting for an answer. Builds on
[the subject model](2026-09-19-subject-model-design.md) (already built and deployed) and
[the authoring strategy](2026-09-19-course-authoring-strategy.md)._

## 1. Why this exists

Flashcards are a memory tool. Reading cards bolted onto them (built earlier today) gave a
lesson-shaped screen, but the deck is still the unit, so there is nothing to say "explain one
idea in a few screens, check the learner understood it, and send them back to the exact screen
they missed." This is a **second engine beside flashcards**, aimed at learning a subject from
nothing to solid understanding. Flashcards, decks and Courses stay exactly as they are.

**Non-goals for now:** replacing flashcards; hosted (product-paid) AI; marketplace or moderation
of other people's lessons; question types beyond multiple choice (later slices).

## 2. What is decided

| Topic            | Decision                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit of learning | A **lesson**: 4 to 10 numbered screens (one idea each, read not flipped), then 3 to 5 questions                                                                                                                                                                                                                          |
| Size             | Not a constraint. A complex subject is 400+ screens. Modules group lessons                                                                                                                                                                                                                                               |
| Graph node       | The **lesson**, a bundle of a few of the old concepts. The old concepts stay as the lesson's **coverage checklist**                                                                                                                                                                                                      |
| Pass rule        | A wrong answer shows the screen that teaches it, then re-asks. Passed only when every question is right. First-try score is recorded                                                                                                                                                                                     |
| Retention        | After passing, each question gets its own spaced-review schedule. A miss sends the learner back to its screen                                                                                                                                                                                                            |
| Storage          | Structured data through the API/MCP. **No new markdown syntax, no new parser**                                                                                                                                                                                                                                           |
| Screen content   | Structured **blocks**: paragraph, list, code, image, callout, formula. Paragraphs allow only bold, italic, inline code                                                                                                                                                                                                   |
| Numbering        | Every screen has a **permanent decimal number** that is also its sort key: 213, then 213.010, 213.020, later 213.025. Never renumbered or reused. Unique across the **whole subject**, and numbers are allowed to get large (Chris, 2026-09-19)                                                                          |
| Stages           | Applied **per lesson**, so module 1 can be finished and safe for learners while module 5 is still being written; a subject-level "finish all" is only a convenience. **Testing**: edit, delete, reorder freely. **Finished**: additive only. You may insert screens but not delete, reorder or change the meaning of one |
| Maths            | Typeset maths, rendered once on the server to SVG (see 7)                                                                                                                                                                                                                                                                |
| Learner help     | A learner can ask for more on a screen. The **owner's** requests become real screens; anyone else's become **private notes**                                                                                                                                                                                             |
| Outline          | A course-outline screen up front (see 4)                                                                                                                                                                                                                                                                                 |
| Owner comments   | In the testing stage the owner can leave a note on any screen number from the reader. Included from the start, because Chris will review by learning the subject himself. It is the seed of the later help requests                                                                                                      |
| Pilot            | The Transformers module **"Input side: text to vectors"** first (about 10 concepts, so roughly 4 lessons), chosen by me at Chris's request                                                                                                                                                                               |
| App section      | Called **Learn** (default)                                                                                                                                                                                                                                                                                               |

## 3. The model

```
Subject
  └─ Module            a named group of lessons, for browsing and progress
       └─ Lesson       a node in the prerequisite graph
            ├─ Screen  numbered, ordered by number, made of blocks
            └─ Question  belongs to a lesson, names the screen that teaches it
```

- **Lesson:** `title`, `summary` (one or two sentences, "what you will learn"), `module`,
  `covers` (concept slugs: the checklist), `prerequisites` (edges to other lessons, each with
  the written reason, derived at first from the reviewed concept edges).
- **Screen:** `number` (exact decimal, unique within the subject), `lesson`, `blocks`,
  `layer` (`shared` or `private`), `author` (`human` or `ai`, with sources for AI).
- **Question (v1: multiple choice):** `lesson`, `teaches` (a screen number), `prompt`,
  `options` (each with `correct` and a short `reason` shown after the pick), `covers`
  (concept slugs it tests).
- **Learner progress:** screens read (by number), each question's status, first-try score,
  lesson passed or not. Per-question review state for retention (reusing the existing scheduler).

**Numbering rules.** Stored as an exact decimal, shown with at least three decimals when
fractional. A pure function suggests a free number between two neighbours (midpoint of the gap,
so any gap can be split again). Moving a screen means it becomes a new screen with a new number.

## 4. The course outline (added by Chris)

The first thing a learner sees in a subject: **what you are going to learn, in order.** Modules
as headings; under each, the lessons in prerequisite order, each with its one-line summary and the
concepts it covers, and its state (locked, available, in progress, passed, due for review). A
lesson is unlocked when its prerequisite lessons are passed. Tapping a lesson opens it. The
outline is derived from the graph, not authored separately, so it can never disagree with it.

## 5. Learner flow

1. **Outline** → pick an available lesson.
2. **Screens**, one at a time: "Screen 3 of 8" plus the small permanent number, Back and Next.
   Position and scroll are remembered.
3. **Questions**, 3 to 5, after the last screen. A right answer shows its reason and moves on.
4. **A wrong answer** shows the reason, then the teaching screen (number shown), then the same
   question again. Repeats until right.
5. **Lesson passed** when all are right. The next lessons unlock and its questions join review.
6. **Review:** a due question is asked on its own; a miss sends the learner to its screen, then
   re-asks (same loop as 4).
7. **"I need more on this"** on any screen: see 8.

## 6. Authoring and stages

Authored through MCP tools (create lesson, add screens, add questions, set prerequisites, publish
a stage), the same way the subject graph is. The server **lints** before saving:

- every question names a screen that exists in its lesson;
- every concept a lesson covers is tested by at least one question, and every question covers a
  concept the lesson lists (so nothing is taught untested, nothing tested untaught);
- a screen has at least one block and no empty text; images resolve; formulas render;
- warnings, not errors: a lesson with fewer than 4 or more than 10 screens, or fewer than 3 or more
  than 5 questions.

Stages are set **per lesson**. In the **testing** stage anything can change and no promise is made to learners. **Finished**
freezes numbers: inserts are allowed (safe, because numbers never change), deletes, reorders and
meaning-changing edits are not, and need a new version of the subject.

## 7. Rich content

- **Text, lists, code, callouts:** native rendering of each block type on web and Android.
- **Images:** the author chooses `inline` or `expandable`. Expandable shows a "Show diagram"
  button that opens the picture full-screen with pinch-zoom; closing returns to the same screen at
  the same scroll position. Android already draws SVG (Coil with its SVG decoder).
- **Typeset maths:** the author writes LaTeX; the server renders it **once, on save**, to an SVG
  and stores both. Clients only display an image, so web and Android match and neither needs a
  maths engine. Each formula carries author-supplied **spoken text** for screen readers. Display
  formulas first; inline symbols in a sentence next, using the renderer's exact sizes so the image
  sits on the text baseline. Dark mode needs testing on both platforms.

## 8. "I need more on this" (learner help)

MCP is pull-only: flashkarte cannot push a message into a user's AI. So the button **queues a
request** and the user's AI picks it up.

1. The learner taps the button on a screen, optionally selecting a term or typing a line.
2. flashkarte saves a **help request** (screen number, lesson, selection, note).
3. The user's AI reads pending requests through an MCP tool, researches, and writes back short
   explanation screens with sources, marked "added by your AI".
4. **If the requester owns the subject:** they become real screens numbered between the neighbours
   (213.021, 213.022). **Otherwise:** private notes under that screen, visible only to that
   learner. The owner sees which screens were flagged and may adopt a note into the lesson.
5. The request is marked answered.

Consequences: answers arrive when the user's AI next runs (not instant); a "copy a ready-made prompt"
fallback exists for now; request text and screen text are **untrusted data** for the AI, and the tool
says so; requests are personal data, so they go in the account export, are deleted with the account
and are added to the GDPR record.

## 9. Open: an in-app AI using the learner's own API key

Chris raised letting the learner add their own AI API key so questions get direct, immediate answers
inside the app. This would replace the queue as the fast path (keeping the queue as fallback).
**Not decided; Chris is thinking about it.** What has to be weighed:

| Option                                                               | For                                                                    | Against                                                                                                                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key kept **on the device only**; the app calls the provider directly | The server never holds a secret key; nothing to leak from our database | Web calling a provider straight from the browser depends on that provider allowing it (I have not verified which do); one implementation per platform; no shared usage limits |
| Key stored **encrypted on our server**; server calls the provider    | Works the same on web and Android; one implementation; can rate-limit  | We hold a secret that costs the user money if leaked; a server compromise becomes a key leak; needs encryption, rotation and a key-management story                           |
| **Product-paid** hosted AI                                           | Simplest for the learner                                               | Cost, abuse and a pricing decision. Previously deferred on purpose                                                                                                            |

A hard rule under any option: keys are never logged, never in the audit log, never in the account
export in clear text, and never sent to the AI or embedded in prompts.

## 10. How it relates to what exists

- **Flashcards, decks, Courses:** unchanged and independent.
- **Subject graph** (concepts, edges with reasons): becomes the source of the lesson graph and the
  coverage checklist. Nothing already built is thrown away.
- **Reading cards:** stay; they are not the lesson mechanism.
- **Spaced repetition:** each lesson question is reviewed on the existing scheduler; the stability
  threshold stays the single shared constant.

## 11. Data sketch (not final)

New tables, additive only: `modules`, `lessons`, `lesson_prerequisites`, `lesson_concepts`,
`screens` (exact-decimal `number`, `blocks` as validated JSON), `lesson_questions`, `screen_reads`,
`question_progress`, `help_requests`, `private_notes`. Screen `number` is `numeric` with a unique
constraint per subject. A shared TypeScript module owns lesson progress, the pass loop, unlocking and
number suggestion, mirrored in Kotlin where Android needs it.

## 12. Unknowns and risks (said plainly)

- **Maths pipeline unproven.** I believe MathJax can output self-contained SVG on a server; I have not
  tried it here. A small prototype must confirm it, and that Android draws the result correctly in
  both themes, before this is committed to.
- **Inline maths on Android** needs baseline-aligned images in text. Believed doable, not proven.
- **Content is the real cost.** 400+ screens for Transformers is authoring, review and correction.
  The engine is a fraction of the work; the AI drafts but Chris must review, as with the graph.
- **A graph coarsened by an LLM is still a hypothesis.** Lesson-level edges derived from concept
  edges need review like the concept ones did.
- **The pass loop can frustrate.** Nothing yet says what happens if a learner cannot pass a lesson
  after many tries (an escape hatch, or a nudge to the "I need more" button). Needs a decision.

## 13. Open idea: entry check and test-out (raised by Chris)

Chris's concern: a learner should be checked, before a course, on what the course assumes, so
nobody starts Transformers without the maths it leans on, or electronics without the basics. This is
really two different things.

**Readiness ("do you know what this course assumes?").** The subject graph already lists what a
course does not teach: the `assumption` concepts (for Transformers: matrix multiplication, the dot
product, probability, derivatives, exp and log, mean and variance, sin and cos, what an RNN is, matrix
rank). An **entry check** asks 2 to 3 questions per assumption and reports each as knows it, shaky or
missing. For a missing one the outline says "before you start, learn X" and points at a primer: a small
optional **Foundations** module inside the course now, or a separate subject later (assumptions can be
resolved to another subject's concepts, as the subject model already allows).

**Placement ("you already know this, skip it").** Vocabulary such as tokens, logits and embeddings is
not assumed knowledge; it is what the first module teaches. A learner who already knows it should not
have to read it. Each lesson can offer a **test-out**: answer its questions cold, without the
screens. All right means the lesson counts as passed (its questions join review, and the first-try
score is recorded). A miss means take the lesson, and the miss names the screen to start from. It
reuses the questions we already write. Run in order along the graph, it doubles as a course-wide
pretest: test out of what you know, and stop where you fail. The outline then shows a personal route:
already known, recommended primer, still to learn.

**Fit with the model.** An entry check is a lesson with questions and no screens. It needs the question
engine first (slice 2), then it is a small addition.

**Cautions.**

- Multiple choice can be guessed (a quarter of the time with four options), so each checked concept
  needs 2 to 3 questions and a stated rule for what counts as known.
- Word results as "likely gap", never as a verdict; a short test cannot certify understanding.
- The list of what a course assumes is an LLM-drafted hypothesis for Chris to review, like the graph.
  The pilot module will show whether it is right.
- The Electronics graph has not been drawn yet, so what that course assumes is not yet known.

**Open decision.** Should a failed readiness check only **recommend** a primer and let the learner
proceed, or actually **stop** them from starting? Chris said "required", so this needs his call. Recommend
is safer against wrongly blocking someone; block is a stronger promise.
