# 09 — Spoken cards (on-device text-to-speech)

**Priority:** 3 · **Effort:** ~4–5 days · **Scope:** migration + server + shared + web + Android + MCP

## Goal

The app reads cards aloud. This serves **two constituencies with one mechanism**:

- **Language learners** — hear the target language pronounced, per deck, with the _front_
  and _back_ spoken in different voices (a German→English deck has two languages on it).
- **Accessibility / read-aloud** — one global switch that speaks every deck in one voice,
  with no per-deck configuration required.

Both must work without the other being configured.

## Decisions (do not re-litigate in the PR)

| #   | Decision                                                                  | Rationale                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **On-device TTS only** — `window.speechSynthesis`, Android `TextToSpeech` | Free, offline-capable on Android, no new dependency, no audio storage. Server-side synthesis would ship card text to a US vendor (third-country transfer) for a voice-quality gain — not worth the GDPR surface. Same no-hosting grain as Spec 03. |
| D2  | **Two language slots per deck** (front + back), not one                   | One slot reads the English translation in a German voice — that actively teaches wrong pronunciation.                                                                                                                                              |
| D3  | **Global defaults + tri-state per-deck override**                         | A boolean per deck cannot express "global on, mute this deck". NULL = inherit.                                                                                                                                                                     |
| D4  | Speaking the **front** is a first-class option, not an afterthought       | hear→recall-meaning is the drill that transfers to conversation; read→recall-meaning is not. Same plumbing.                                                                                                                                        |
| D5  | Resolution lives in `packages/shared` (TS + Kotlin)                       | Guardrails shared-logic rule. Two clients resolving precedence independently is exactly how they drift.                                                                                                                                            |
| D6  | Session mute is transient, not a stored setting                           | "Headphones off, I'm in a library" is a _session_ need. Persisting it corrupts the user's real preference.                                                                                                                                         |

## Data model

Migration `018_speech.sql`. All new columns nullable or defaulted — existing rows and
Android APKs in the field keep working (guardrails §DB).

```sql
-- Global defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_enabled  boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_lang     text;                            -- BCP-47; NULL → users.language → client locale
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_autoplay text NOT NULL DEFAULT 'back';    -- off | front | back | both
ALTER TABLE users ADD COLUMN IF NOT EXISTS speech_rate     real NOT NULL DEFAULT 1.0;

-- Per-deck overrides. NULL = inherit the user default.
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_enabled    boolean;  -- tri-state: NULL inherit / true on / false muted
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_front_lang text;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_back_lang  text;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_autoplay   text;
ALTER TABLE decks ADD COLUMN IF NOT EXISTS speech_rate       real;
```

Add `CHECK` constraints on the two `speech_autoplay` columns (`off|front|back|both`),
following the `users_account_type_chk` precedent in `005_account_type.sql`.

## Resolution — `packages/shared/src/speech/resolve.ts` (+ Kotlin port)

Pure function, no I/O:

```
resolveSpeech(user, deck, deviceLocale) -> {
  frontLang: string | null,   // null = do not speak this side
  backLang:  string | null,
  autoplay:  'off' | 'front' | 'back' | 'both',
  rate:      number,
}
```

Precedence, per field: **deck value if non-NULL, else user value, else built-in default.**

| `deck.speech_enabled` | `user.speech_enabled` | Result |
| --------------------- | --------------------- | ------ |
| NULL                  | false                 | silent |
| NULL                  | true                  | speaks |
| true                  | false                 | speaks | ← language learner configured one deck; global untouched |
| false                 | true                  | silent | ← read-aloud user muted one deck                         |

Language for a side: `deck.speech_<side>_lang ?? user.speech_lang ?? user.language ??
deviceLocale`. This is what makes the a11y case work with zero deck configuration, and it
composes correctly: a read-aloud user studying a configured Spanish deck hears Spanish
pronounced properly rather than mangled by their own locale's voice.

## Requirements

1. **Server:** `PATCH /api/auth/me` accepts the four `speech*` fields (extend
   `profileUpdateSchema` in `auth.service.ts`); `PATCH /api/decks/:id` accepts the five
   deck fields (extend the zod schema in `decks.service.ts`, alongside `isOrdered`).
   Language tags validated as BCP-47 shape only — **not** against `SUPPORTED_LANGUAGES`,
   which is the UI-locale list (en/de/fr/es) and has nothing to do with which voices a
   device has. Both endpoints must accept payloads omitting every new field.
2. **Web — global:** speech section in `SettingsPage` (on/off, voice language, autoplay
   mode, rate). **Web — per-deck:** `packages/web/src/pages/StudyPage.tsx` and the deck
   list currently expose _no_ per-deck settings surface at all (`is_ordered` has no web UI
   either) — this spec builds the first one: a deck settings sheet reachable from
   `DeckListItem`, containing the speech override with an explicit **Inherit / On / Off**
   control. Do not build `is_ordered` into it; out of scope, but leave room.
3. **Web — playback:** a speaker button next to front and back text, always present when
   that side has a resolved language, independent of autoplay. Keyboard shortcut `s` to
   replay the currently visible side. `speechSynthesis.cancel()` before every `speak()`
   and on card advance/unmount — a stale utterance talking over the next card is the
   defining bug of this feature.
4. **Web — voice availability:** `getVoices()` returns `[]` until `voiceschanged` fires;
   resolve voices through a small helper that awaits it. If no voice matches the resolved
   tag, fall back to the base language (`de-DE` → `de`); if still none, that side is
   silent and the settings sheet says so plainly ("No es-ES voice on this device") rather
   than failing quietly.
5. **Web — autoplay gesture policy:** Chrome/Safari drop `speak()` outside a user gesture.
   Reveal is a click, so `back`/`both` autoplay is safe. **`front` autoplay on the first
   card is not** when the user deep-links to `/decks/:id/study` — prime the synth on the
   first user interaction of the session and skip front-autoplay for card 1 if no gesture
   has occurred. Never retry-loop; a missed first utterance is acceptable, a hang is not.
6. **Android:** `TextToSpeech` init in the study screen's ViewModel scope, released on
   clear. `LANG_MISSING_DATA` / `LANG_NOT_SUPPORTED` → surface the install-voice-data
   intent once, then degrade to silent. Mirror the web UI: global section in
   `SettingsScreen`, per-deck override sheet, speaker button, session mute.
7. **Session mute:** a mute toggle in the study screen header on both clients. Suppresses
   autoplay for the session only; the speaker button still works; nothing is persisted
   server-side (web may keep it in `sessionStorage`).
8. **MCP** (`packages/mcp/src/tools/decks.ts`): `create_deck` and `update_deck` accept the
   deck speech fields, documented in the tool description. This is the main on-ramp — an
   AI authoring a Spanish deck knows it is Spanish and can ship it pre-configured, so the
   user never opens a settings sheet.
9. **i18n:** all new strings in `en/de/fr/es` (`packages/web/src/i18n/locales/`), parity
   test as established by the help-centre work.
10. **Anti-fragility:** speech never gates reveal or rating. Every TTS call is
    fire-and-forget; any failure is silence.

## Explicit non-goals

Server-side synthesis, audio file upload/hosting, per-card audio URLs, a `@lang` markdown
directive (that is a parser change → TS + Kotlin + corpus, separate spec), speech
_recognition_, per-card language overrides, word-level highlighting during playback.

## Acceptance criteria

1. Global switch on, no deck configured: every deck speaks the back on reveal in the
   user's language. Zero per-deck setup.
2. Deck with `front=de-DE`, `back=en-GB` and global switch **off**: that deck speaks both
   sides in the right voices; other decks stay silent.
3. Deck override set to Off with global switch on: that deck is silent, others speak.
4. Resolution truth table above passes identically in TS and Kotlin.
5. Advancing mid-utterance stops it; the next card never speaks over the previous.
6. Configured language with no installed voice: side is silent, settings sheet names the
   missing voice, card is still revealable and ratable.
7. `PATCH /api/auth/me` and `PATCH /api/decks/:id` with no speech fields behave exactly as
   before (old-client contract test).

## Tests

Shared: `resolveSpeech` truth table, both ports (TS Jest + Kotlin JUnit), including the
language-fallback chain. Server: zod acceptance/rejection of speech fields, old-payload
contract tests on both endpoints, migration applies to a populated DB. Web (Vitest): mock
`speechSynthesis`, assert cancel-before-speak, cancel-on-advance, speaker button present
only when a side resolves, no autoplay when session-muted, XSS-free settings rendering.
Android: ViewModel tests with a fake TTS — init failure degrades silently, language
missing surfaces once, mute suppresses autoplay but not manual playback.
