import {
  CORRECT_TARGET,
  isDiagnostic,
  type ParsedCard,
} from "../markdown/parser";

// The special wrong-option target meaning "plain wrong, no remediation".
const END_TARGET = "end";

/**
 * A single multiple-choice option ready to render.
 *
 * `optionIndex` is the index into the card's authored `options` for a diagnostic
 * card, or `null` for a generated distractor / the injected correct answer on an
 * ordinary card. It is the value recorded in `review_events.option_index`, so it
 * stays stable regardless of the shuffled presentation order (Spec 05 mines it
 * for confusion pairs).
 */
export interface StudyOption {
  text: string;
  optionIndex: number | null;
  correct: boolean;
  remediationLabel: string | null;
}

/** Outcome of picking one option: correctness, the SM-2 rating, and an
 *  optional remediation card to show as an interlude. */
export interface ChoiceResolution {
  correct: boolean;
  rating: 4 | 1;
  remediationLabel: string | null;
}

/**
 * Resolve a picked authored option on a diagnostic card by its stable index.
 * Deterministic (no RNG) — the TS and Kotlin ports must agree exactly.
 *
 * The right option (`-> correct`) rates Good (4); any other rates Again (1). A
 * wrong option routing to a label yields that remediation label; one routing to
 * `end` (or an out-of-range index) yields none.
 */
export function resolveChoice(
  card: ParsedCard,
  optionIndex: number,
): ChoiceResolution {
  const option = card.options[optionIndex];
  if (!option) {
    // Defensive: an index with no authored option is treated as a plain wrong
    // answer with no remediation.
    return { correct: false, rating: 1, remediationLabel: null };
  }
  const correct = option.goto === CORRECT_TARGET;
  const remediationLabel =
    correct || option.goto === END_TARGET ? null : option.goto;
  return { correct, rating: correct ? 4 : 1, remediationLabel };
}

/**
 * Build the multiple-choice options to present for a card.
 *
 * Diagnostic card: all authored options, shuffled, each tagged with its stable
 * authored index and pre-resolved correctness/remediation (via resolveChoice).
 * Ordinary card: the back as the correct answer plus up to `count - 1` distinct
 * distractors drawn from `sessionPool` (the existing random-distractor MC
 * behavior), shuffled. Deterministic given `rng`.
 */
export function selectOptions(
  card: ParsedCard,
  sessionPool: string[],
  count = 4,
  rng: () => number = Math.random,
): StudyOption[] {
  if (isDiagnostic(card)) {
    const authored: StudyOption[] = card.options.map((option, index) => {
      const resolution = resolveChoice(card, index);
      return {
        text: option.text,
        optionIndex: index,
        correct: resolution.correct,
        remediationLabel: resolution.remediationLabel,
      };
    });
    return shuffle(authored, rng);
  }

  const distractors: string[] = [];
  const seen = new Set<string>([card.back]);
  for (const candidate of sessionPool) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    distractors.push(candidate);
  }
  const chosen = shuffle(distractors, rng).slice(0, Math.max(count - 1, 0));

  const generated: StudyOption[] = [
    {
      text: card.back,
      optionIndex: null,
      correct: true,
      remediationLabel: null,
    },
    ...chosen.map((text) => ({
      text,
      optionIndex: null,
      correct: false,
      remediationLabel: null,
    })),
  ];
  return shuffle(generated, rng);
}

/** In-place-safe Fisher-Yates shuffle driven by `rng` (mirror of Kotlin's
 *  List.shuffled(Random)). Returns a new array. */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
