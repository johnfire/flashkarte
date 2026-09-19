/**
 * Screen numbers are permanent exact decimals that are also the sort key of a lesson's screens:
 * 213, then 213.010, 213.020, later 213.025. A screen keeps its number for life, so inserting a
 * clarifying screen between two neighbours never disturbs anyone's progress.
 *
 * Numbers are strings and arithmetic is BigInt, never floating point: 213.025 has no exact binary
 * form, and an off-by-one-ulp screen number would silently reorder a lesson.
 *
 * Canonical form: a whole number is written without a fraction ("213"); a fractional number always
 * shows at least three decimals and never a trailing zero beyond the third ("213.010", "213.0225").
 */

/** Decimals allowed. Each insert into the same gap halves it, so this bounds nested inserts. */
export const MAX_SCREEN_NUMBER_DECIMALS = 12;

/** Decimals of the shortest number an insert tries first: three, as in 213.010. */
const STEP_DECIMALS = 3;
/** The first insert after a screen steps by 0.010, ten units at three decimals, leaving room for 99 more. */
const STEP_UNITS = 10n;
const MIN_FRACTION_DIGITS = 3;

const SCALE = 10n ** BigInt(MAX_SCREEN_NUMBER_DECIMALS);
const STEP =
  STEP_UNITS * 10n ** BigInt(MAX_SCREEN_NUMBER_DECIMALS - STEP_DECIMALS);
const SHAPE = /^(0|[1-9]\d*)(\.\d+)?$/;

/** A screen number as an integer count of 10^-12, or null when the text is not a valid number. */
function toScaled(input: string): bigint | null {
  const match = SHAPE.exec(input);
  if (!match) return null;
  const fraction = (match[2] ?? "").slice(1);
  if (fraction.length > MAX_SCREEN_NUMBER_DECIMALS) return null;
  const scaled =
    BigInt(match[1]) * SCALE +
    BigInt(fraction.padEnd(MAX_SCREEN_NUMBER_DECIMALS, "0"));
  return scaled > 0n ? scaled : null;
}

function fromScaled(scaled: bigint): string {
  const whole = (scaled / SCALE).toString();
  const rawFraction = (scaled % SCALE)
    .toString()
    .padStart(MAX_SCREEN_NUMBER_DECIMALS, "0")
    .replace(/0+$/, "");
  if (rawFraction === "") return whole;
  return `${whole}.${rawFraction.padEnd(MIN_FRACTION_DIGITS, "0")}`;
}

export function isValidScreenNumber(input: string): boolean {
  return toScaled(input) !== null;
}

/** The canonical spelling of a valid number ("213.01" becomes "213.010"). Throws on an invalid one. */
export function normalizeScreenNumber(input: string): string {
  const scaled = toScaled(input);
  if (scaled === null)
    throw new RangeError(`Not a valid screen number: "${input}"`);
  return fromScaled(scaled);
}

/** Negative when a comes first, positive when b does, zero when they are the same number. */
export function compareScreenNumbers(a: string, b: string): number {
  const left = toScaled(a);
  const right = toScaled(b);
  if (left === null || right === null) {
    throw new RangeError(
      `Not a valid screen number: "${left === null ? a : b}"`,
    );
  }
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The shortest decimal strictly between two scaled values, nearest their middle at that length.
 * Tries three decimals, then four, and so on, so numbers stay as short as the gap allows.
 */
function shortestBetween(lower: bigint, upper: bigint): bigint | null {
  for (
    let decimals = STEP_DECIMALS;
    decimals <= MAX_SCREEN_NUMBER_DECIMALS;
    decimals++
  ) {
    const unit = 10n ** BigInt(MAX_SCREEN_NUMBER_DECIMALS - decimals);
    const first = lower / unit + 1n;
    const last = (upper - 1n) / unit;
    if (first <= last) return ((first + last) / 2n) * unit;
  }
  return null;
}

/**
 * A free number for a new screen placed between `before` and `after`.
 *
 * - No neighbours: "1". Only `before` (appending): the next whole number.
 * - Only `after` (inserting at the start): a number below it.
 * - Between two screens: `before` plus 0.010 when that leaves room, else the shortest number between.
 *
 * Throws when the gap is too small to split (only after a dozen nested inserts at one point).
 */
export function suggestScreenNumber(
  before: string | null,
  after: string | null,
): string {
  const lower = before === null ? 0n : toScaled(before);
  const upper = after === null ? null : toScaled(after);
  if (lower === null)
    throw new RangeError(`Not a valid screen number: "${before}"`);
  if (after !== null && upper === null) {
    throw new RangeError(`Not a valid screen number: "${after}"`);
  }
  if (upper === null) {
    return before === null ? "1" : fromScaled((lower / SCALE + 1n) * SCALE);
  }
  if (lower >= upper) {
    throw new RangeError(`"${before}" must come before "${after}"`);
  }
  const stepped = lower + STEP;
  if (stepped < upper) return fromScaled(stepped);
  const between = shortestBetween(lower, upper);
  if (between === null) {
    throw new RangeError(
      `No room to insert between "${before}" and "${after}"`,
    );
  }
  return fromScaled(between);
}
