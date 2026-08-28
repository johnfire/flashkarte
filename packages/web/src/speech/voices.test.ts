import { describe, test, expect } from "vitest";
import { pickVoice } from "./voices";

const voice = (lang: string) =>
  ({ lang, name: `voice-${lang}` }) as SpeechSynthesisVoice;

describe("pickVoice", () => {
  const voices = [voice("de-DE"), voice("en-GB"), voice("pt")];

  test("prefers an exact tag match", () => {
    expect(pickVoice(voices, "de-DE")?.lang).toBe("de-DE");
  });

  test("matches case- and separator-insensitively", () => {
    expect(pickVoice(voices, "DE_de")?.lang).toBe("de-DE");
  });

  test("falls back to a voice for the base language", () => {
    // Only a generic `pt` voice is installed — a pt-BR deck should still speak.
    expect(pickVoice(voices, "pt-BR")?.lang).toBe("pt");
    // And the reverse: a regional voice serves a bare base tag.
    expect(pickVoice(voices, "de")?.lang).toBe("de-DE");
  });

  test("returns null when nothing matches, so the caller stays silent", () => {
    expect(pickVoice(voices, "ja-JP")).toBeNull();
    expect(pickVoice([], "de-DE")).toBeNull();
  });
});
