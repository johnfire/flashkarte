import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LessonStep, RevealedAnswer } from "../api/learn-types";
import { LessonBlocks } from "./LessonBlocks";

type QuestionStep = Extract<LessonStep, { kind: "question" }>;

/**
 * One question: pick an option, then see whether it was right and why. Nothing here knows the
 * right answer until the server says so in the reply.
 */
export function QuestionView({
  step,
  answer,
  disabled,
  onAnswer,
  onContinue,
  extra,
}: {
  step: QuestionStep;
  /** Present once answered: shows the verdict and the reasons. */
  answer: RevealedAnswer | null;
  disabled: boolean;
  onAnswer: (choice: number) => void;
  onContinue: () => void;
  extra?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<number | null>(null);

  return (
    <article className="rounded-xl border p-6 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {t("learn.questionProgress", {
          current: Math.min(step.answered + 1, step.total),
          total: step.total,
        })}
      </p>
      <div id="question-prompt" className="mb-4 font-medium">
        <LessonBlocks blocks={step.prompt} />
      </div>
      <fieldset
        disabled={disabled || answer !== null}
        aria-labelledby="question-prompt"
        className="space-y-2"
      >
        {step.options.map((option, position) => {
          const shown = answer !== null;
          const isRight = shown && position === answer.correct_position;
          const isWrongPick =
            shown && position === answer.chosen_position && !answer.correct;
          return (
            <label
              key={position}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                isRight
                  ? "border-green-600 bg-green-50 dark:bg-green-950"
                  : isWrongPick
                    ? "border-red-600 bg-red-50 dark:bg-red-950"
                    : ""
              }`}
            >
              <input
                type="radio"
                name="answer"
                className="mt-1"
                checked={
                  shown
                    ? position === answer.chosen_position
                    : chosen === position
                }
                onChange={() => setChosen(position)}
              />
              <span className="flex-1">
                <LessonBlocks blocks={option.blocks} />
                {isRight && (
                  <span className="mt-1 block text-sm font-medium text-green-800 dark:text-green-300">
                    {t("learn.rightOption")}
                  </span>
                )}
                {isWrongPick && (
                  <span className="mt-1 block text-sm font-medium text-red-800 dark:text-red-300">
                    {t("learn.wrongOption")}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      {answer ? (
        <div role="status" className="mt-4 space-y-3">
          <p className="font-semibold">
            {answer.correct ? t("learn.correct") : t("learn.notQuite")}
          </p>
          <LessonBlocks blocks={answer.reason} />
          {!answer.correct && (
            <div>
              <p className="text-sm font-medium">{t("learn.whyRightOne")}</p>
              <LessonBlocks blocks={answer.correct_reason} />
            </div>
          )}
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
          >
            {answer.correct ? t("learn.continue") : t("learn.reviewScreens")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || chosen === null}
          onClick={() => chosen !== null && onAnswer(chosen)}
          className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {t("learn.checkAnswer")}
        </button>
      )}
      {extra}
    </article>
  );
}
