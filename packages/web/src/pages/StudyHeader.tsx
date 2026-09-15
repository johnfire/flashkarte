import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { StudyMode } from "../study/useStudyMode";

interface StudyHeaderProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  showMute: boolean;
  muted: boolean;
  onToggleMute: () => void;
  current: number;
  total: number;
}

const MODES = ["flip", "choice"] as const;

/** The bar above the card: back to decks, speech mute (Flip mode), the
 *  Flip/Choice toggle (Spec 08), and session progress. */
export function StudyHeader({
  mode,
  onModeChange,
  showMute,
  muted,
  onToggleMute,
  current,
  total,
}: StudyHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
      <Link to="/" className="text-indigo-600">
        {t("study.decks")}
      </Link>
      <div className="flex items-center gap-3">
        {showMute && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            className="text-indigo-600"
          >
            {muted ? t("study.speech.unmute") : t("study.speech.mute")}
          </button>
        )}
        <div className="flex overflow-hidden rounded-lg border text-xs">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
              className={`px-2 py-1 ${
                mode === m
                  ? "bg-indigo-600 text-white"
                  : "bg-transparent text-gray-500 dark:text-gray-400"
              }`}
            >
              {t(`study.mode.${m}`)}
            </button>
          ))}
        </div>
        <span>{t("study.progress", { current, total })}</span>
      </div>
    </div>
  );
}
