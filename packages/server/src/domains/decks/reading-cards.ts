import { isReading, type ParsedCard } from "@flashkarte/shared";
import { ValidationError } from "../../utils/errors";

/**
 * Rules for reading cards (lessons). A reading card is a title and a body; it has no
 * answer to rate, so it can carry neither options nor word senses. Lessons live in
 * spaced-repetition decks; a branch deck is a play-only path with no SR state, so
 * mixing the two is rejected (the same wall diagnostic cards respect).
 */
export function validateReadingCards(cards: ParsedCard[]): void {
  const lessons = cards.filter(isReading);
  if (lessons.length === 0) return;

  if (cards.some((card) => card.type === "branch")) {
    throw new ValidationError(
      "A deck can't mix branch cards with reading cards",
    );
  }
  for (const lesson of lessons) {
    if (!lesson.back.trim()) {
      throw new ValidationError(`Reading card "${lesson.front}" has no body`);
    }
    if (lesson.options.length > 0 || lesson.sense) {
      throw new ValidationError(
        `Reading card "${lesson.front}" can't have options or word senses`,
      );
    }
  }
}
