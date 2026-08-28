import { useEffect, useState } from "react";
import { loadVoices, pickVoice, speechSupported } from "./voices";

export interface VoiceLanguage {
  tag: string;
  label: string;
}

function describe(tag: string, uiLocale: string): string {
  try {
    const names = new Intl.DisplayNames([uiLocale], { type: "language" });
    return names.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * The language tags this device can actually speak.
 *
 * The picker is built from the installed voices rather than a fixed list
 * because voice availability is a property of the user's device, not of the
 * app — offering `ja-JP` on a machine with no Japanese voice would be a lie.
 * `installed` lets callers warn about a stored tag that is no longer present.
 */
export function useVoiceLanguages(uiLocale: string) {
  const [languages, setLanguages] = useState<VoiceLanguage[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [loaded, setLoaded] = useState(!speechSupported());

  useEffect(() => {
    let active = true;
    loadVoices().then((found) => {
      if (!active) return;
      setVoices(found);
      const tags = [...new Set(found.map((v) => v.lang.replace(/_/g, "-")))];
      setLanguages(
        tags
          .map((tag) => ({ tag, label: `${describe(tag, uiLocale)} (${tag})` }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [uiLocale]);

  return {
    languages,
    loaded,
    supported: speechSupported(),
    installed: (tag: string | null) =>
      tag === null || pickVoice(voices, tag) !== null,
  };
}
