import {
  clampSpeechRate,
  resolveSpeech,
  shouldAutoplay,
  speechBaseLanguage,
  type DeckSpeechOverrides,
  type UserSpeechDefaults,
} from "./resolve";

// Kotlin mirror: android/.../domain/speech/SpeechResolverTest.kt — the truth
// table below is duplicated there case for case.

const user = (over: Partial<UserSpeechDefaults> = {}): UserSpeechDefaults => ({
  enabled: false,
  lang: null,
  autoplay: "back",
  rate: 1.0,
  uiLanguage: null,
  ...over,
});

const deck = (
  over: Partial<DeckSpeechOverrides> = {},
): DeckSpeechOverrides => ({
  enabled: null,
  frontLang: null,
  backLang: null,
  autoplay: null,
  rate: null,
  ...over,
});

describe("resolveSpeech — on/off truth table (TS/Kotlin parity)", () => {
  it("inherits off: silent when neither is set", () => {
    const r = resolveSpeech(user({ enabled: false }), deck({ enabled: null }));
    expect(r).toEqual({
      frontLang: null,
      backLang: null,
      autoplay: "off",
      rate: 1.0,
    });
  });

  it("inherits on: the read-aloud user gets every deck spoken, unconfigured", () => {
    const r = resolveSpeech(
      user({ enabled: true, uiLanguage: "de" }),
      deck({ enabled: null }),
    );
    expect(r.frontLang).toBe("de");
    expect(r.backLang).toBe("de");
  });

  it("deck on overrides the global switch being off", () => {
    const r = resolveSpeech(
      user({ enabled: false }),
      deck({ enabled: true, frontLang: "de-DE", backLang: "en-GB" }),
    );
    expect(r.frontLang).toBe("de-DE");
    expect(r.backLang).toBe("en-GB");
  });

  it("deck off mutes one deck while the global switch stays on", () => {
    const r = resolveSpeech(
      user({ enabled: true, lang: "en" }),
      deck({ enabled: false, frontLang: "de-DE" }),
    );
    expect(r.frontLang).toBeNull();
    expect(r.backLang).toBeNull();
    expect(r.autoplay).toBe("off");
  });
});

describe("resolveSpeech — language fallback chain", () => {
  it("prefers the deck language over every global value", () => {
    const r = resolveSpeech(
      user({ enabled: true, lang: "en-US", uiLanguage: "en" }),
      deck({ frontLang: "es-ES", backLang: "es-ES" }),
    );
    expect(r.frontLang).toBe("es-ES");
  });

  it("falls back deck -> user speech lang -> ui language -> device locale", () => {
    const enabled = { enabled: true } as const;
    expect(
      resolveSpeech(
        user({ ...enabled, lang: "fr-FR", uiLanguage: "de" }),
        deck(),
        "en-US",
      ).backLang,
    ).toBe("fr-FR");
    expect(
      resolveSpeech(user({ ...enabled, uiLanguage: "de" }), deck(), "en-US")
        .backLang,
    ).toBe("de");
    expect(resolveSpeech(user(enabled), deck(), "en-US").backLang).toBe(
      "en-US",
    );
    expect(resolveSpeech(user(enabled), deck(), null).backLang).toBeNull();
  });

  it("treats blank strings as unset rather than as a language", () => {
    const r = resolveSpeech(
      user({ enabled: true, lang: "  ", uiLanguage: "de" }),
      deck({ frontLang: "", backLang: "   " }),
    );
    expect(r.frontLang).toBe("de");
    expect(r.backLang).toBe("de");
  });

  it("speaks only the configured side when the other has no fallback", () => {
    const r = resolveSpeech(
      user({ enabled: true }),
      deck({ frontLang: "ja-JP" }),
      null,
    );
    expect(r.frontLang).toBe("ja-JP");
    expect(r.backLang).toBeNull();
  });
});

describe("resolveSpeech — autoplay and rate", () => {
  it("takes the deck autoplay over the user default", () => {
    const r = resolveSpeech(
      user({ enabled: true, uiLanguage: "de", autoplay: "back" }),
      deck({ autoplay: "front" }),
    );
    expect(r.autoplay).toBe("front");
  });

  it("keeps the resolved rate even when speech is off", () => {
    const r = resolveSpeech(user({ enabled: false, rate: 0.8 }), deck());
    expect(r.rate).toBe(0.8);
  });

  it("clamps and rounds the rate to 2dp for port parity", () => {
    expect(clampSpeechRate(0.1)).toBe(0.5);
    expect(clampSpeechRate(9)).toBe(2.0);
    expect(clampSpeechRate(0.8333333)).toBe(0.83);
    expect(clampSpeechRate(null)).toBe(1.0);
    expect(clampSpeechRate(Number.NaN)).toBe(1.0);
  });
});

describe("shouldAutoplay", () => {
  const spoken = resolveSpeech(
    user({ enabled: true }),
    deck({ frontLang: "de-DE", backLang: "en-GB", autoplay: "back" }),
  );

  it("plays only the named side", () => {
    expect(shouldAutoplay(spoken, "back")).toBe(true);
    expect(shouldAutoplay(spoken, "front")).toBe(false);
  });

  it("plays both sides on 'both' and neither on 'off'", () => {
    expect(shouldAutoplay({ ...spoken, autoplay: "both" }, "front")).toBe(true);
    expect(shouldAutoplay({ ...spoken, autoplay: "both" }, "back")).toBe(true);
    expect(shouldAutoplay({ ...spoken, autoplay: "off" }, "back")).toBe(false);
  });

  it("never plays a side with no resolved language", () => {
    expect(
      shouldAutoplay({ ...spoken, autoplay: "both", backLang: null }, "back"),
    ).toBe(false);
  });
});

describe("speechBaseLanguage", () => {
  it("strips the region so a generic voice can still be found", () => {
    expect(speechBaseLanguage("de-DE")).toBe("de");
    expect(speechBaseLanguage("pt_BR")).toBe("pt");
    expect(speechBaseLanguage("de")).toBe("de");
  });
});
