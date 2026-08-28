import { speechBaseLanguage } from "@flashkarte/shared";

/**
 * Voice lookup for the Web Speech API.
 *
 * `speechSynthesis.getVoices()` famously returns an empty list until the engine
 * has loaded and fired `voiceschanged`, so every caller here goes through
 * `loadVoices()` rather than reading the list directly. Some engines never fire
 * the event at all, hence the poll and the hard timeout: a missing voice list
 * must degrade to "no voice", never to a hang.
 */

const VOICES_TIMEOUT_MS = 2000;
const VOICES_POLL_MS = 100;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cached: SpeechSynthesisVoice[] | null = null;

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSupported()) return Promise.resolve([]);
  if (cached && cached.length > 0) return Promise.resolve(cached);

  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length > 0) {
    cached = immediate;
    return Promise.resolve(immediate);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      if (voices.length > 0) cached = voices;
      resolve(voices);
    };
    const onChanged = () => finish(window.speechSynthesis.getVoices());
    const poll = window.setInterval(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) finish(voices);
    }, VOICES_POLL_MS);
    const timeout = window.setTimeout(() => finish([]), VOICES_TIMEOUT_MS);
    window.speechSynthesis.addEventListener("voiceschanged", onChanged);
  });
}

/** Normalise `pt_BR` / `PT-br` to a comparable `pt-br`. */
function normalise(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * The best installed voice for a tag: exact match first, then the base
 * language, so a device carrying only a generic `de` voice still speaks a
 * `de-DE` deck instead of falling silent.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const wanted = normalise(lang);
  const exact = voices.find((v) => normalise(v.lang) === wanted);
  if (exact) return exact;
  const base = speechBaseLanguage(wanted);
  return (
    voices.find((v) => speechBaseLanguage(normalise(v.lang)) === base) ?? null
  );
}

/** Test seam: drop the memoised list so a suite can install new voices. */
export function resetVoiceCache(): void {
  cached = null;
}
