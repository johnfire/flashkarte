import { useTranslation } from "react-i18next";
import { NeedMoreOnThis } from "./NeedMoreOnThis";
import { OpenBook } from "./OpenBook";
import { PassedView, PausedView, StuckNote } from "./LessonEndViews";
import { QuestionView } from "./QuestionView";
import { ScreenView } from "./ScreenView";
import type { useLessonRun } from "./useLessonRun";

/** Draws whatever step the server says the learner is on. */
export function LessonStepBody({
  subjectId,
  slug,
  run,
}: {
  subjectId: string;
  slug: string;
  run: ReturnType<typeof useLessonRun>;
}) {
  const { t } = useTranslation();
  const { step, feedback, busy } = run;

  // Right after an answer: the verdict and reasons, before anything else.
  if (feedback) {
    const { question, response } = feedback;
    return (
      <QuestionView
        key={`${question.presentation_id}-${question.misses}-${question.answered}-feedback`}
        step={question}
        answer={response.answer}
        disabled={busy}
        onAnswer={run.answer}
        onContinue={run.afterFeedback}
        extra={
          response.answer.help_offered && !response.passed ? (
            <StuckNote
              onPause={run.pause}
              more={
                <NeedMoreOnThis
                  key={question.question_id}
                  subjectId={subjectId}
                  slug={slug}
                  target={{ question: question.question_id }}
                  screenNumber={null}
                  notices={question.help}
                />
              }
            />
          ) : null
        }
      />
    );
  }
  if (!step) return null;

  switch (step.kind) {
    case "screen":
      return (
        <ScreenView
          subjectId={subjectId}
          slug={slug}
          number={step.number}
          sources={step.sources}
          addedInAnswer={step.added_in_answer}
          help={step.help}
          label={t("learn.screenOf", {
            current: step.index + 1,
            total: step.total,
          })}
          blocks={step.blocks}
          canGoBack={step.can_go_back}
          nextLabel={
            step.index + 1 === step.total
              ? t("learn.startQuestions")
              : t("learn.next")
          }
          disabled={busy}
          onBack={run.back}
          onNext={run.next}
        />
      );
    case "remediation":
      return (
        <ScreenView
          subjectId={subjectId}
          slug={slug}
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
          nextLabel={t("learn.continue")}
          disabled={busy}
          onNext={run.carryOn}
          note={step.help_offered ? <StuckNote onPause={run.pause} /> : null}
        />
      );
    case "question":
      return (
        <QuestionView
          key={`${step.presentation_id}-${step.misses}-${step.answered}`}
          step={step}
          answer={null}
          disabled={busy}
          onAnswer={run.answer}
          onContinue={run.afterFeedback}
          extra={
            <>
              {step.help_offered && (
                <StuckNote
                  onPause={run.pause}
                  more={
                    <NeedMoreOnThis
                      key={step.question_id}
                      subjectId={subjectId}
                      slug={slug}
                      target={{ question: step.question_id }}
                      screenNumber={null}
                      notices={step.help}
                    />
                  }
                />
              )}
              <OpenBook subjectId={subjectId} slug={slug} />
            </>
          }
        />
      );
    case "passed":
      return (
        <PassedView
          subjectId={subjectId}
          firstTryRight={step.first_try_right}
          total={step.total}
          unlocked={run.unlocked}
        />
      );
    case "paused":
      return <PausedView subjectId={subjectId} onResume={run.resume} />;
  }
}
