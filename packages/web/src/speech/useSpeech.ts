import { useCallback, useEffect, useRef, useState } from "react";
import { clampSpeechRate } from "@flashkarte/shared";
import { loadVoices, pickVoice, speechSupported } from "./voices";

const MUTE_KEY = "flashkarte.speech.muted";

/**
 * Session mute — "headphones off, I'm in a library".
 *
 * Deliberately transient (sessionStorage, never the server): muting for one
 * sitting must not overwrite the settings the learner actually chose. Storage
 * can throw in private modes, so every access is guarded.
 */
export function useSessionMute(): [boolean, (muted: boolean) => void] {
  const [muted, setMutedState] = useState(() => {
    try {
      return window.sessionStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    try {
      window.sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      // A browser refusing storage is not a reason to refuse muting.
    }
  }, []);
  return [muted, setMuted];
}

export interface SpeechController {
  /** False when the browser has no speech engine at all. */
  supported: boolean;
  /** Speak one side. A null language, or no matching voice, is a silent no-op. */
  speak: (text: string, lang: string | null, rate?: number) => void;
  cancel: () => void;
  /**
   * Whether the document has had a user gesture yet. Chrome and Safari drop
   * `speak()` calls made without one, so autoplay of the *front* of the first
   * card is skipped on a cold deep-link rather than silently failing.
   */
  primed: boolean;
}

/**
 * Speech playback for the study screen.
 *
 * Every entry point is fire-and-forget: speech never gates reveal or rating,
 * and any engine failure degrades to silence. The one invariant worth stating
 * is cancel-before-speak — without it, advancing a card leaves the previous
 * utterance talking over the next one.
 */
export function useSpeech(): SpeechController {
  const supported = speechSupported();
  const [primed, setPrimed] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    loadVoices().then((voices) => {
      if (active) voicesRef.current = voices;
    });
    return () => {
      active = false;
    };
  }, [supported]);

  // Sticky activation is a document-level property, so an in-app navigation
  // from the deck list already counts; only a cold load of /decks/:id/study
  // starts unprimed. `userActivation` is not in every browser — fall back to
  // watching for the first gesture ourselves.
  useEffect(() => {
    const activation = (
      navigator as Navigator & {
        userActivation?: { hasBeenActive: boolean };
      }
    ).userActivation;
    if (activation?.hasBeenActive) {
      setPrimed(true);
      return;
    }
    const onGesture = () => setPrimed(true);
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  const cancel = useCallback(() => {
    if (!supported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Nothing to do — a failed cancel must not break the study flow.
    }
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: string | null, rate = 1) => {
      if (!supported || !lang) return;
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      const voice = pickVoice(voicesRef.current, lang);
      if (!voice) return;
      try {
        // Cancel first, always: two utterances overlapping is the defining bug
        // of a spoken flashcard app.
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.lang = lang;
        utterance.voice = voice;
        utterance.rate = clampSpeechRate(rate);
        window.speechSynthesis.speak(utterance);
      } catch {
        // Silence is the correct failure mode.
      }
    },
    [supported],
  );

  // Leaving the study screen mid-utterance must not keep talking.
  useEffect(() => cancel, [cancel]);

  return { supported, speak, cancel, primed };
}
