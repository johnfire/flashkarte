import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SPEECH_AUTOPLAY_MODES,
  type SpeechAutoplay,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
  DEFAULT_SPEECH_RATE,
  DEFAULT_SPEECH_AUTOPLAY,
} from "@flashkarte/shared";
import { api, ApiError, type ProfilePatch } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { VoiceSelect } from "../../speech/VoiceSelect";

/**
 * Global speech defaults.
 *
 * These are what a read-aloud user configures once and never revisits: the
 * switch plus a voice. Language learners mostly leave this alone and configure
 * individual decks instead, which override anything set here.
 */
export function SpeechSection() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  // Tolerate a user object from before these fields existed (a restored
  // session, an older cached profile) rather than crashing the settings page.
  const rate = user.speechRate ?? DEFAULT_SPEECH_RATE;
  const autoplayMode = user.speechAutoplay ?? DEFAULT_SPEECH_AUTOPLAY;

  async function save(patch: ProfilePatch) {
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await api.auth.updateProfile(patch);
      updateUser(updated);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.speech.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-lg border p-4">
      <h2 className="mb-1 text-xl font-semibold">
        {t("settings.speech.title")}
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.speech.hint")}
      </p>

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={user.speechEnabled ?? false}
          disabled={saving}
          onChange={(e) => save({ speechEnabled: e.target.checked })}
        />
        <span>{t("settings.speech.enable")}</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <VoiceSelect
          label={t("settings.speech.voice")}
          value={user.speechLang ?? null}
          emptyLabel={t("settings.speech.voiceDefault")}
          onChange={(tag) => save({ speechLang: tag })}
        />

        <label className="block text-sm">
          <span className="mb-1 block font-medium">
            {t("settings.speech.autoplay")}
          </span>
          <select
            value={autoplayMode}
            disabled={saving}
            onChange={(e) =>
              save({ speechAutoplay: e.target.value as SpeechAutoplay })
            }
            className="w-full rounded-lg border bg-transparent px-3 py-2"
          >
            {SPEECH_AUTOPLAY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`settings.speech.autoplayMode.${mode}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium">
          {t("settings.speech.rate", { rate: rate.toFixed(2) })}
        </span>
        <input
          type="range"
          min={MIN_SPEECH_RATE}
          max={MAX_SPEECH_RATE}
          step={0.05}
          value={rate}
          disabled={saving}
          onChange={(e) => save({ speechRate: Number(e.target.value) })}
          className="w-full"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
