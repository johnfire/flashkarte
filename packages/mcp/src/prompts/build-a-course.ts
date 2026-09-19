import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BUILD_A_COURSE_PROMPT = `The user wants help learning something new in flashkarte. Walk through this \
process rather than jumping straight to authoring cards:

1. **Clarify the goal.** What do they actually want to learn, how much do \
they already know, and roughly how much material is reasonable (a few \
decks, or a dozen)? Don't guess at scope -- ask if it's unclear.

2. **Ground it in real sources.** Ask what the user already has (a \
textbook, a course syllabus, their own notes) before inventing content. If \
they don't have a source and want you to find one, say so explicitly and \
look for one rather than fabricating facts from memory. Read enough of the \
actual source to write cards you're confident are accurate -- a good rule \
of thumb: if you can't point to where a fact came from, don't put it in a \
card.

3. **Model the subject as a prerequisite graph before writing any cards.** \
A course is only as good as its order, and order should come from what \
depends on what, not from a textbook's chapter order. List the concepts \
(atomic: one thing assessable by one question; split anything that needs \
"and"), then draw edges. An edge from A to B is "requires" only if a bright \
newcomer could not follow B's explanation without A; if A merely helps, use \
"suggests". Data-flow order (how a machine runs) is not learning order. \
Write a one-sentence reason for every "requires" edge, name what the course \
assumes but does not teach as "assumption" concepts, and add a "map" \
concept for an ungated overview to read first. Then call import_subject \
(see its description for the rules) and lint_subject. **The graph is a \
hypothesis, not a fact: show the user the edges and their reasons and ask \
them to correct it before building on it** -- they are the only check on \
whether it is right, and a clean lint only means it is consistent. Link \
cards to their concepts with link_concept_cards as you author them.

4. **Design a syllabus** from the graph's route, prerequisites first, \
grouping roughly 5-10 concepts per unit. Break the goal into an ordered sequence of \
right-sized units (each a deck of maybe 20-100 cards, one clear topic). \
Create the course first with create_course, then create each unit with \
create_deck's course_id parameter, in learning order -- this attaches each \
deck to the course as you go instead of create-then-attach. Use \
add_deck_to_course only for an already-existing deck you want to fold in.

5. **Author each deck to fit what's actually being taught, not for its own \
sake:**
   - Plain front/back for straightforward facts and definitions.
   - Diagnostic (multiple-choice) cards -- see create_deck's own \
description for the exact "-> correct" / "-> label" / "-> end" syntax -- \
for genuine points of confusion: things learners plausibly get backwards or \
mix up. A wrong pick can route to a short follow-up card explaining that \
specific mistake. Don't force every card into this shape; use it where a \
real confusion exists.
   - Sense blocks (see create_deck's own description for the \
"- meaning | example | hint" syntax) for a term with multiple genuinely \
distinct meanings.
   - Do NOT use "@concept"/"@depth" tags -- that syntax isn't implemented \
yet and would corrupt card content.

6. **Review the structure with the user** before considering it done -- \
show them the course (get_course lists it with each deck's card count) and \
ask if the sequencing and depth feel right, rather than silently building \
everything and walking away.

Courses gate cross-deck automatically: a later deck unlocks once every \
card in the deck before it is stable (reviewed correctly enough times \
without lapsing) -- you don't need to build that yourself, just get the \
order right.`;

export function registerCoursePrompts(server: McpServer) {
  server.prompt(
    "build_a_course",
    "Walks through building a structured, gated, multi-deck course for a " +
      "learning goal: clarify the goal, ground it in real sources, design a " +
      "syllabus, author each deck with the card type that actually fits, " +
      "then review the result with the user. Use this whenever a user asks " +
      'something like "help me learn X" rather than requesting one deck.',
    {
      goal: z
        .string()
        .optional()
        .describe(
          "What the user wants to learn, if already known (e.g. " +
            '"the basics of circuit analysis").',
        ),
    },
    ({ goal }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: goal
              ? `${BUILD_A_COURSE_PROMPT}\n\nThe user's stated goal: ${goal}`
              : BUILD_A_COURSE_PROMPT,
          },
        },
      ],
    }),
  );
}
