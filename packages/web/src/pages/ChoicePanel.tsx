import { useTranslation } from "react-i18next";
import type { StudyOption } from "@flashkarte/shared";
import { CardText } from "../components/CardText";

interface ChoicePanelProps {
  cardNumberLabel: string;
  category: string | null;
  front: string;
  options: StudyOption[];
  selected: StudyOption | null;
  onChoose: (option: StudyOption) => void;
  onContinue: () => void;
}

/**
 * Multiple-choice study UI: the front prompt, option buttons, and (once one is
 * picked) a Continue button. Picking an option only reveals correctness --
 * grading and advancing happen on Continue (StudyPage.onContinue), so a wrong
 * routed diagnostic pick has a moment to show which option was correct before
 * any remediation interlude appears.
 */
export function ChoicePanel({
  cardNumberLabel,
  category,
  front,
  options,
  selected,
  onChoose,
  onContinue,
}: ChoicePanelProps) {
  const { t } = useTranslation();
  const answered = selected !== null;

  return (
    <>
      <div className="rounded-xl border p-8 shadow-sm">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {cardNumberLabel}
          {category && ` · ${category}`}
        </p>
        <p className="text-lg font-medium">
          <CardText text={front} />
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((option, i) => {
          const isSelected = selected === option;
          const stateClass = !answered
            ? "border-gray-300 hover:border-indigo-400 dark:border-gray-600"
            : option.correct
              ? "border-green-600 bg-green-50 dark:bg-green-950"
              : isSelected
                ? "border-red-600 bg-red-50 dark:bg-red-950"
                : "border-gray-300 opacity-60 dark:border-gray-600";
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onChoose(option)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium disabled:cursor-default ${stateClass}`}
            >
              <span className="mr-2 text-xs text-gray-400">{i + 1}.</span>
              <CardText text={option.text} />
            </button>
          );
        })}
      </div>

      {answered && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
        >
          {t("study.continue")}
        </button>
      )}
    </>
  );
}
