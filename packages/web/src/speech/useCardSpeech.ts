import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveSpeech, shouldAutoplay } from "@flashkarte/shared";
import { api } from "../api/client";
import { DeckSettings } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useSpeech, useSessionMute } from "./useSpeech";

interface CardText {
  front: string;
  back: string;
}

/**
 * Everything the study screen needs in order to speak: the resolved settings,
 * a replay function, and the autoplay/keyboard wiring.
 *
 * Kept out of the study page itself because none of it is about rendering a
 * card — the page stays a thin renderer over the shared resolution rule.
 */
export function useCardSpeech(
  deckId: string | undefined,
  card: CardText | null,
  revealed: boolean,
  idx: number,
) {
  const { user } = useAuth();
  const [deck, setDeck] = useState<DeckSettings | null>(null);
  const [muted, setMuted] = useSessionMute();
  const { speak, cancel, primed, supported } = useSpeech();

  // A deck's speech settings are a nice-to-have: a failure here leaves the
  // session silent rather than blocking the study flow.
  useEffect(() => {
    if (!deckId) return;
    let active = true;
    api.decks
      .settings(deckId)
      .then((settings) => active && setDeck(settings))
      .catch(() => active && setDeck(null));
    return () => {
      active = false;
    };
  }, [deckId]);

  // Global defaults + this deck's overrides, resolved by the shared rule so
  // web and Android can never disagree about precedence.
  const speech = useMemo(
    () =>
      resolveSpeech(
        {
          enabled: user?.speechEnabled ?? false,
          lang: user?.speechLang ?? null,
          autoplay: user?.speechAutoplay ?? "back",
          rate: user?.speechRate ?? 1,
          uiLanguage: user?.language ?? null,
        },
        {
          enabled: deck?.speech_enabled ?? null,
          frontLang: deck?.speech_front_lang ?? null,
          backLang: deck?.speech_back_lang ?? null,
          autoplay: deck?.speech_autoplay ?? null,
          rate: deck?.speech_rate ?? null,
        },
        typeof navigator === "undefined" ? null : navigator.language,
      ),
    [user, deck],
  );

  const speakSide = useCallback(
    (side: "front" | "back") => {
      if (!card) return;
      const lang = side === "front" ? speech.frontLang : speech.backLang;
      speak(side === "front" ? card.front : card.back, lang, speech.rate);
    },
    [card, speech, speak],
  );

  // Autoplay the front as a card appears. Skipped on the first card of a cold
  // deep-link: no user gesture has happened yet, so Chrome and Safari would
  // drop the utterance regardless. Arriving from the deck list keeps the
  // document's activation, so the common path is unaffected.
  useEffect(() => {
    if (!card || revealed || muted) return;
    if (!shouldAutoplay(speech, "front")) return;
    if (!primed && idx === 0) return;
    speakSide("front");
  }, [card, revealed, muted, speech, primed, idx, speakSide]);

  // Autoplay the back on reveal — always preceded by a click, never blocked.
  useEffect(() => {
    if (!card || !revealed || muted) return;
    if (!shouldAutoplay(speech, "back")) return;
    speakSide("back");
  }, [card, revealed, muted, speech, speakSide]);

  // `s` replays whichever side is showing; reveal and rating keep their keys.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "s" && event.key !== "S") return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      speakSide(revealed ? "back" : "front");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, speakSide]);

  return {
    speech,
    speakSide,
    muted,
    setMuted,
    cancel,
    canSpeak:
      supported && (speech.frontLang !== null || speech.backLang !== null),
  };
}
