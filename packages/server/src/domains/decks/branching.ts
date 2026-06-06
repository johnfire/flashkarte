import type { ParsedCard } from "@flashkarte/shared";
import { ValidationError } from "../../utils/errors";

/**
 * Validate the graph of a parsed deck when it contains branch cards.
 * No-op for pure front/back decks. Cycles are allowed; only dangling targets,
 * duplicate labels, and empty option fields are rejected.
 */
export function validateBranching(cards: ParsedCard[]): void {
  if (!cards.some((c) => c.type === "branch")) return;

  const labels = new Set<string>();
  for (const c of cards) {
    if (c.label === null) continue;
    if (labels.has(c.label)) {
      throw new ValidationError(`Duplicate card label "${c.label}"`);
    }
    labels.add(c.label);
  }

  for (const c of cards) {
    if (c.type !== "branch") continue;
    if (c.options.length === 0) {
      throw new ValidationError(`Branch card "${c.front}" has no options`);
    }
    for (const o of c.options) {
      if (!o.text.trim() || !o.goto.trim()) {
        throw new ValidationError(
          `Branch card "${c.front}" has an empty option`,
        );
      }
      if (o.goto !== "end" && !labels.has(o.goto)) {
        throw new ValidationError(
          `Option "${o.text}" points to unknown card "${o.goto}"`,
        );
      }
    }
  }
}
