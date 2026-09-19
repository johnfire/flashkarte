import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { LessonStepBody } from "./LessonStepBody";
import { useLessonRun } from "./useLessonRun";

/** /learn/:subjectId/lessons/:slug — one lesson, screen by screen, then its questions. */
export function LessonPage() {
  const { t } = useTranslation();
  const { subjectId, slug } = useParams<{ subjectId: string; slug: string }>();
  const run = useLessonRun(subjectId!, slug!);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to={`/learn/${subjectId}`}
        className="mb-4 inline-block text-sm text-gray-700 dark:text-gray-300"
      >
        {t("learn.toOutlineArrow")}
      </Link>
      {run.lesson && (
        <h1 className="mb-4 text-2xl font-bold">{run.lesson.title}</h1>
      )}
      {run.error && (
        <p role="alert" className="mb-4 text-red-700 dark:text-red-400">
          {run.error}
        </p>
      )}
      {!run.step && run.busy && <p>{t("learn.loading")}</p>}
      <LessonStepBody subjectId={subjectId!} slug={slug!} run={run} />
    </main>
  );
}
