import { afterEach, describe, test, expect, vi } from "vitest";
import { loadVoices, pickVoice, resetVoiceCache } from "./voices";

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

describe("loadVoices", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetVoiceCache();
  });

  test("a pending poll keeps working after the speech global has gone", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [],
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    const pending = loadVoices();
    // The engine can disappear while the 100 ms poll and 2 s timeout are still pending.
    vi.unstubAllGlobals();
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toEqual([]);
  });
});
