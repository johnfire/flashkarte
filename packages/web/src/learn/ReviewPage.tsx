import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { QuestionView } from "./QuestionView";
import { ScreenView } from "./ScreenView";
import { useReviewRun } from "./useReviewRun";

/** /learn/:subjectId/reviews — questions that have come due, asked one at a time. */
export function ReviewPage() {
  const { t } = useTranslation();
  const { subjectId } = useParams<{ subjectId: string }>();
  const run = useReviewRun(subjectId!);
  const { step, feedback, due } = run;

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to={`/learn/${subjectId}`}
        className="mb-4 inline-block text-sm text-gray-700 dark:text-gray-300"
      >
        {t("learn.toOutlineArrow")}
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{t("learn.reviewTitle")}</h1>
      {run.error && (
        <p role="alert" className="mb-4 text-red-700 dark:text-red-400">
          {run.error}
        </p>
      )}
      {run.busy && !step && !feedback && <p>{t("learn.loading")}</p>}
      {!run.busy && due && due.due.length === 0 && !step && !feedback && (
        <p>{t("learn.nothingDue")}</p>
      )}
      {feedback && (
        <QuestionView
          key={`${feedback.question.presentation_id}-feedback`}
          step={feedback.question}
          answer={feedback.response.answer}
          disabled={run.busy}
          onAnswer={run.answer}
          onContinue={run.afterFeedback}
        />
      )}
      {!feedback && step?.kind === "question" && (
        <QuestionView
          key={`${step.presentation_id}-${step.misses}`}
          step={step}
          answer={null}
          disabled={run.busy}
          onAnswer={run.answer}
          onContinue={run.afterFeedback}
        />
      )}
      {!feedback && step?.kind === "remediation" && (
        <ScreenView
          subjectId={subjectId!}
          number={step.number}
          sources={step.sources}
          addedInAnswer={step.added_in_answer}
          help={step.help}
          label={t("learn.reread", {
            current: step.position + 1,
            total: step.of,
          })}
          blocks={step.blocks}
          canGoBack={false}
          isOwner={due?.is_owner ?? false}
          nextLabel={t("learn.continue")}
          disabled={run.busy}
          onNext={run.carryOn}
        />
      )}
      {!feedback && step?.kind === "review_done" && (
        <article className="rounded-xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{t("learn.reviewDone")}</h2>
          <button
            type="button"
            onClick={run.next}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
          >
            {t("learn.nextReview")}
          </button>
        </article>
      )}
    </main>
  );
}
