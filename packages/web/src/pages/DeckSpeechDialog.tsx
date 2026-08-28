import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SPEECH_AUTOPLAY_MODES,
  type SpeechAutoplay,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
  DEFAULT_SPEECH_RATE,
} from "@flashkarte/shared";
import { api, ApiError, type DeckSpeechPatch } from "../api/client";
import { VoiceSelect } from "../speech/VoiceSelect";

interface DeckSpeechDialogProps {
  deckId: string;
  deckTitle: string;
  onClose: () => void;
}

/** Tri-state: inherit the global default, force on, or mute this deck. */
type EnabledChoice = "inherit" | "on" | "off";

function toChoice(value: boolean | null): EnabledChoice {
  if (value === null) return "inherit";
  return value ? "on" : "off";
}

function fromChoice(choice: EnabledChoice): boolean | null {
  if (choice === "inherit") return null;
  return choice === "on";
}

/**
 * Per-deck speech overrides.
 *
 * The two language pickers are the point of the whole feature: a de->en deck
 * spoken with one voice would pronounce the English side as German. Everything
 * else defaults to "inherit" so a learner only has to answer the question they
 * actually care about.
 */
export function DeckSpeechDialog({
  deckId,
  deckTitle,
  onClose,
}: DeckSpeechDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState<EnabledChoice>("inherit");
  const [frontLang, setFrontLang] = useState<string | null>(null);
  const [backLang, setBackLang] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState<SpeechAutoplay | null>(null);
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api.decks
      .settings(deckId)
      .then((deck) => {
        if (!active) return;
        setEnabled(toChoice(deck.speech_enabled));
        setFrontLang(deck.speech_front_lang);
        setBackLang(deck.speech_back_lang);
        setAutoplay(deck.speech_autoplay);
        setRate(deck.speech_rate);
      })
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : t("decks.speech.loadError"),
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [deckId, t]);

  async function save() {
    setSaving(true);
    setError(null);
    const patch: DeckSpeechPatch = {
      speechEnabled: fromChoice(enabled),
      speechFrontLang: frontLang,
      speechBackLang: backLang,
      speechAutoplay: autoplay,
      speechRate: rate,
    };
    try {
      await api.decks.setSpeech(deckId, patch);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("decks.speech.saveError"),
      );
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("decks.speech.title", { title: deckTitle })}
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
        <h2 className="mb-1 text-xl font-semibold">
          {t("decks.speech.title", { title: deckTitle })}
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t("decks.speech.hint")}
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">{t("decks.speech.loading")}</p>
        ) : (
          <div className="grid gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("decks.speech.enabled")}
              </span>
              <select
                value={enabled}
                onChange={(e) => setEnabled(e.target.value as EnabledChoice)}
                className="w-full rounded-lg border bg-transparent px-3 py-2"
              >
                <option value="inherit">
                  {t("decks.speech.enabledInherit")}
                </option>
                <option value="on">{t("decks.speech.enabledOn")}</option>
                <option value="off">{t("decks.speech.enabledOff")}</option>
              </select>
            </label>

            <VoiceSelect
              label={t("decks.speech.frontLang")}
              value={frontLang}
              emptyLabel={t("decks.speech.inherit")}
              onChange={setFrontLang}
            />
            <VoiceSelect
              label={t("decks.speech.backLang")}
              value={backLang}
              emptyLabel={t("decks.speech.inherit")}
              onChange={setBackLang}
            />

            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("settings.speech.autoplay")}
              </span>
              <select
                value={autoplay ?? ""}
                onChange={(e) =>
                  setAutoplay(
                    e.target.value === ""
                      ? null
                      : (e.target.value as SpeechAutoplay),
                  )
                }
                className="w-full rounded-lg border bg-transparent px-3 py-2"
              >
                <option value="">{t("decks.speech.inherit")}</option>
                {SPEECH_AUTOPLAY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`settings.speech.autoplayMode.${mode}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm">
              <label className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rate === null}
                  onChange={(e) =>
                    setRate(e.target.checked ? null : DEFAULT_SPEECH_RATE)
                  }
                />
                <span>{t("decks.speech.rateInherit")}</span>
              </label>
              {rate !== null && (
                <label className="block">
                  <span className="mb-1 block font-medium">
                    {t("settings.speech.rate", { rate: rate.toFixed(2) })}
                  </span>
                  <input
                    type="range"
                    min={MIN_SPEECH_RATE}
                    max={MAX_SPEECH_RATE}
                    step={0.05}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? t("decks.speech.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
