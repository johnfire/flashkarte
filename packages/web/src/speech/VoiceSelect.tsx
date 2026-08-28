import { useTranslation } from "react-i18next";
import { useVoiceLanguages } from "./useVoiceLanguages";

interface VoiceSelectProps {
  label: string;
  value: string | null;
  onChange: (tag: string | null) => void;
  /** Text for the empty option — "inherit" on a deck, "my language" globally. */
  emptyLabel: string;
}

/**
 * Language picker backed by the device's installed voices.
 *
 * When the stored tag has no installed voice it is still offered as an option
 * and called out explicitly: silently dropping the user's own setting because
 * this particular device lacks the voice would be worse than saying so.
 */
export function VoiceSelect({
  label,
  value,
  onChange,
  emptyLabel,
}: VoiceSelectProps) {
  const { t, i18n } = useTranslation();
  const { languages, loaded, supported, installed } = useVoiceLanguages(
    i18n.language,
  );
  const missing = value !== null && loaded && !installed(value);

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value)
        }
        disabled={!supported}
        className="w-full rounded-lg border bg-transparent px-3 py-2"
      >
        <option value="">{emptyLabel}</option>
        {missing && <option value={value}>{value}</option>}
        {languages.map((l) => (
          <option key={l.tag} value={l.tag}>
            {l.label}
          </option>
        ))}
      </select>
      {missing && (
        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">
          {t("settings.speech.missingVoice", { lang: value })}
        </span>
      )}
      {loaded && supported && languages.length === 0 && (
        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">
          {t("settings.speech.noVoices")}
        </span>
      )}
      {!supported && (
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          {t("settings.speech.unsupported")}
        </span>
      )}
    </label>
  );
}
