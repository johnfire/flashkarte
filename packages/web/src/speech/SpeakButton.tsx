import { useTranslation } from "react-i18next";

interface SpeakButtonProps {
  onSpeak: () => void;
  /** The side's resolved language, for the accessible label. */
  lang: string;
}

/**
 * Replay control for one side of a card.
 *
 * Always offered when the side has a voice, independent of autoplay: learning a
 * word means hearing it three times, and the autoplay setting is about the
 * first time only.
 */
export function SpeakButton({ onSpeak, lang }: SpeakButtonProps) {
  const { t } = useTranslation();
  const label = t("study.speech.speak", { lang });
  return (
    <button
      type="button"
      onClick={onSpeak}
      title={label}
      aria-label={label}
      className="rounded p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.06A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z" />
      </svg>
    </button>
  );
}
