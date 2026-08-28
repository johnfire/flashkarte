/**
 * Speech settings resolution (Spec 09).
 *
 * Two constituencies share one mechanism: language learners configure a deck
 * (front and back spoken in different voices), while read-aloud users flip one
 * global switch and configure nothing. Both are expressed as global defaults
 * plus per-deck overrides, and this module is the single place the precedence
 * between them is decided.
 *
 * Deliberately pure and deterministic — the TS and Kotlin ports must agree
 * exactly (guardrails: shared-logic rule). Web and Android are thin renderers
 * over `resolveSpeech`; neither may re-implement precedence locally.
 */

/** When a card side is spoken automatically. */
export type SpeechAutoplay = "off" | "front" | "back" | "both";

/** Which side of a card is being spoken. */
export type CardSide = "front" | "back";

export const SPEECH_AUTOPLAY_MODES: readonly SpeechAutoplay[] = [
  "off",
  "front",
  "back",
  "both",
];

export const DEFAULT_SPEECH_AUTOPLAY: SpeechAutoplay = "back";
export const DEFAULT_SPEECH_RATE = 1.0;
export const MIN_SPEECH_RATE = 0.5;
export const MAX_SPEECH_RATE = 2.0;

/** The user's global defaults (`users.speech_*`). */
export interface UserSpeechDefaults {
  enabled: boolean;
  /** Preferred voice language, BCP-47. Null falls back to `uiLanguage`. */
  lang: string | null;
  autoplay: SpeechAutoplay;
  rate: number;
  /** `users.language` — the UI locale, used as the next fallback after `lang`. */
  uiLanguage: string | null;
}

/** A deck's overrides (`decks.speech_*`). Null means "inherit". */
export interface DeckSpeechOverrides {
  /** Tri-state: null inherit / true always on / false muted for this deck. */
  enabled: boolean | null;
  frontLang: string | null;
  backLang: string | null;
  autoplay: SpeechAutoplay | null;
  rate: number | null;
}

/**
 * The effective settings for one deck on one device.
 *
 * A non-null `frontLang`/`backLang` means that side *can* be spoken — the
 * manual speaker button is offered for it. `autoplay` separately decides
 * whether it is spoken without being asked. Speech being off entirely is
 * represented as both languages null, so a caller that only checks the
 * languages can never accidentally speak.
 */
export interface ResolvedSpeech {
  frontLang: string | null;
  backLang: string | null;
  autoplay: SpeechAutoplay;
  rate: number;
}

/** Empty/blank language tags are stored by some clients as ""; treat as unset. */
function blankToNull(tag: string | null | undefined): string | null {
  if (tag === null || tag === undefined) return null;
  const trimmed = tag.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Clamp to the supported range and round to 2dp.
 *
 * The rounding is not cosmetic: Android once drifted from the server on SM-2
 * easiness rounding alone, so every float crossing the port boundary is pinned
 * to a fixed precision here.
 */
export function clampSpeechRate(rate: number | null | undefined): number {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return DEFAULT_SPEECH_RATE;
  }
  const bounded = Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, rate));
  return Math.round(bounded * 100) / 100;
}

/**
 * The base language of a BCP-47 tag: `de-DE` → `de`.
 *
 * Clients use this as the second attempt when no installed voice matches the
 * exact tag — a device with only a generic `de` voice should still speak a
 * `de-DE` deck rather than falling silent.
 */
export function speechBaseLanguage(tag: string): string {
  const separator = tag.search(/[-_]/);
  return separator === -1 ? tag : tag.slice(0, separator);
}

/**
 * Resolve global defaults + deck overrides into the settings for one deck.
 *
 * Precedence is one rule: **a non-null deck value wins over the user value.**
 * That single rule yields all four useful states of the on/off control —
 * inherit-off, inherit-on, forced-on (a configured language deck while the
 * global switch is off) and muted (one deck silenced while the switch is on).
 *
 * `deviceLocale` is the last-resort language so the read-aloud case works with
 * no configuration at all; pass null if the platform cannot report one.
 */
export function resolveSpeech(
  user: UserSpeechDefaults,
  deck: DeckSpeechOverrides,
  deviceLocale: string | null = null,
): ResolvedSpeech {
  const rate = clampSpeechRate(deck.rate ?? user.rate);
  const enabled = deck.enabled ?? user.enabled;
  if (!enabled) {
    return { frontLang: null, backLang: null, autoplay: "off", rate };
  }

  // The fallback chain is what makes a bare global switch useful: a user who
  // never opens a deck's settings still gets their own language, while a deck
  // that *is* configured keeps its own voices even for that same user.
  const fallback =
    blankToNull(user.lang) ??
    blankToNull(user.uiLanguage) ??
    blankToNull(deviceLocale);

  return {
    frontLang: blankToNull(deck.frontLang) ?? fallback,
    backLang: blankToNull(deck.backLang) ?? fallback,
    autoplay: deck.autoplay ?? user.autoplay,
    rate,
  };
}

/**
 * Whether one side should be spoken without the learner asking.
 *
 * Session mute is deliberately *not* an input here: it is a transient UI state
 * ("headphones off, I'm in a library"), so clients apply it on top rather than
 * letting it reach stored settings.
 */
export function shouldAutoplay(
  resolved: ResolvedSpeech,
  side: CardSide,
): boolean {
  const lang = side === "front" ? resolved.frontLang : resolved.backLang;
  if (lang === null) return false;
  return resolved.autoplay === "both" || resolved.autoplay === side;
}
