import { CardSense } from "../markdown/parser";

/**
 * Consecutive non-lapsed reviews after which a card counts as stable.
 *
 * This deliberately does NOT gate on `interval_days`. Under the fixed-cadence
 * scheduler Hard is always 1 day and Good always 2, so an interval only restates
 * which button was last pressed — an honest Good-presser would never cross a day
 * threshold. `repetitions` resets on a lapse and is otherwise independent of both
 * the rating and the scheduler, so it survives future scheduling changes.
 *
 * Spec 06 (depth ladders) must gate on this too rather than its own STABLE_DAYS.
 */
export const STABLE_REPS = 3;

export type WordPhase = "chain" | "split";

export interface SenseProgress {
  repetitions: number;
}

/**
 * A word stays chained until EVERY one of its senses is stable. Because a lapse
 * resets `repetitions`, graduation is reversible: failing one sense re-chains the
 * whole word so it gets mapped together again rather than drilled blind.
 */
export function wordPhase(senses: SenseProgress[]): WordPhase {
  if (senses.length === 0) return "chain";
  return senses.every((s) => s.repetitions >= STABLE_REPS) ? "split" : "chain";
}

export interface PromptCard {
  front: string;
  sense: CardSense | null;
}

/**
 * The prompt a client renders where the front would otherwise go. Chain hands the
 * sense over via the hint; split takes the scaffold away and asks with the context
 * sentence. Cards that are not senses always render their front, which is exactly
 * the behaviour every existing card already has.
 */
export function promptFor(card: PromptCard, phase: WordPhase): string {
  const sense = card.sense;
  if (!sense) return card.front;
  if (phase === "split") return sense.context ?? card.front;
  return sense.hint
    ? `${card.front} — ${sense.hint}?`
    : `${card.front} — meaning ${sense.index + 1} of ${sense.count}`;
}
