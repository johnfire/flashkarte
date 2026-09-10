import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";

/**
 * The reveal button and, once revealed, the four rating buttons plus the hint
 * linking to the help page that explains what each rating schedules.
 */
const RATINGS = [
  { value: 1, labelKey: "again", className: "bg-red-600" },
  { value: 3, labelKey: "hard", className: "bg-amber-600" },
  { value: 4, labelKey: "good", className: "bg-green-600" },
  { value: 5, labelKey: "easy", className: "bg-emerald-600" },
];

interface StudyControlsProps {
  revealed: boolean;
  onReveal: () => void;
  onGrade: (rating: number) => void;
}

export function StudyControls({
  revealed,
  onReveal,
  onGrade,
}: StudyControlsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mt-6">
        {!revealed ? (
          <button
            onClick={onReveal}
            className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
          >
            {t("study.showAnswer")}
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => onGrade(r.value)}
                className={`rounded-lg ${r.className} py-3 text-sm font-medium text-white`}
              >
                {t(`study.${r.labelKey}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {revealed && (
        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          <Trans
            i18nKey="study.ratingHint"
            components={[
              <Link
                key="0"
                to="/help/studying#ratings"
                className="text-indigo-600"
              />,
            ]}
          />
        </p>
      )}
    </>
  );
}
