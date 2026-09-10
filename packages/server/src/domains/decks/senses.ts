import type { ParsedCard } from "@flashkarte/shared";
import { ValidationError } from "../../utils/errors";

/**
 * Validate word blocks (Spec 10). No-op for decks without sense cards.
 *
 * Two rules, both about things the parser can express but the study engine cannot
 * make sense of:
 *
 *  - A card carrying BOTH sense lines and routed options. The parser keeps today's
 *    behaviour and flags it rather than silently dropping one of the two.
 *  - A headword written as more than one block. Every sense card is stamped with the
 *    `count` of its own block, but senses are grouped at study time by `word` alone —
 *    so two blocks merge into one word whose cards disagree about how many senses it
 *    has, and the "meaning N of M" prompt starts lying. There is no legitimate reason
 *    to split a word, so it is refused rather than repaired.
 *
 * `existingWords` carries the words already stored in the deck, so appending a block
 * for a headword that is already there is caught too — the parser only ever sees the
 * markdown of the current request.
 */
export function validateSenses(
  cards: ParsedCard[],
  existingWords: ReadonlySet<string> = new Set(),
): void {
  const conflicted = cards.find((c) => c.senseConflict);
  if (conflicted) {
    throw new ValidationError(
      `Card "${conflicted.front}" mixes sense lines with routed options — use one or the other`,
    );
  }

  const byWord = new Map<string, ParsedCard[]>();
  for (const card of cards) {
    if (!card.sense) continue;
    byWord.set(card.sense.word, [...(byWord.get(card.sense.word) ?? []), card]);
  }

  for (const [word, senseCards] of byWord) {
    // Comparing the blocks' own counts to each other is not enough: two blocks of
    // equal size agree with one another while both disagree with reality.
    const split = senseCards.some((c) => c.sense?.count !== senseCards.length);
    if (split || existingWords.has(word)) {
      throw new ValidationError(
        `"${senseCards[0].front}" is written as more than one block — put every meaning of a word in a single block`,
      );
    }
  }
}
