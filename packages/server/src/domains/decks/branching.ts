import {
  CORRECT_TARGET,
  isDiagnostic,
  type ParsedCard,
} from "@flashkarte/shared";
import { ValidationError } from "../../utils/errors";

const END_TARGET = "end";

/**
 * Validate the option graph of a parsed deck. No-op for pure front/back decks.
 *
 * Two card families carry options:
 *  - branch cards (play-only, no SR state) — a "branch deck";
 *  - diagnostic cards (Spec 01: basic cards with a `-> correct` option) — these
 *    live in an "SR deck" alongside ordinary basic cards.
 * The two don't mix: an SR deck may not contain branch cards. Cycles are allowed;
 * dangling targets, duplicate labels, empty options, and a diagnostic card
 * without exactly one `-> correct` option are rejected.
 */
export function validateBranching(cards: ParsedCard[]): void {
  const branchCards = cards.filter((c) => c.type === "branch");
  const diagnosticCards = cards.filter((c) => isDiagnostic(c));

  if (branchCards.length === 0 && diagnosticCards.length === 0) return;

  // The branch/SR wall: relaxed only to let diagnostic cards into SR decks.
  if (diagnosticCards.length > 0 && branchCards.length > 0) {
    throw new ValidationError(
      "A deck can't mix branch cards with diagnostic cards",
    );
  }

  const labels = new Set<string>();
  const cardByLabel = new Map<string, ParsedCard>();
  for (const c of cards) {
    if (c.label === null) continue;
    if (labels.has(c.label)) {
      throw new ValidationError(`Duplicate card label "${c.label}"`);
    }
    labels.add(c.label);
    cardByLabel.set(c.label, c);
  }

  for (const c of branchCards) {
    if (c.options.length === 0) {
      throw new ValidationError(`Branch card "${c.front}" has no options`);
    }
    for (const o of c.options) {
      if (!o.text.trim() || !o.goto.trim()) {
        throw new ValidationError(
          `Branch card "${c.front}" has an empty option`,
        );
      }
      if (o.goto !== END_TARGET && !labels.has(o.goto)) {
        throw new ValidationError(
          `Option "${o.text}" points to unknown card "${o.goto}"`,
        );
      }
    }
  }

  for (const c of diagnosticCards) {
    validateDiagnosticCard(c, cardByLabel);
  }
}

/**
 * A diagnostic card must have exactly one `-> correct` option; every other
 * option is either `end` (plain wrong) or a remediation label resolving to a
 * basic card in the same deck (one hop — remediation cards are ordinary cards).
 */
function validateDiagnosticCard(
  card: ParsedCard,
  cardByLabel: Map<string, ParsedCard>,
): void {
  const correctCount = card.options.filter(
    (o) => o.goto === CORRECT_TARGET,
  ).length;
  if (correctCount !== 1) {
    throw new ValidationError(
      `Diagnostic card "${card.front}" must have exactly one "-> correct" option`,
    );
  }
  for (const o of card.options) {
    if (!o.text.trim() || !o.goto.trim()) {
      throw new ValidationError(
        `Diagnostic card "${card.front}" has an empty option`,
      );
    }
    if (o.goto === CORRECT_TARGET || o.goto === END_TARGET) continue;
    const target = cardByLabel.get(o.goto);
    if (!target) {
      throw new ValidationError(
        `Option "${o.text}" points to unknown card "${o.goto}"`,
      );
    }
    if (target.type !== "basic") {
      throw new ValidationError(
        `Diagnostic remediation "${o.goto}" must be a basic card`,
      );
    }
  }
}
