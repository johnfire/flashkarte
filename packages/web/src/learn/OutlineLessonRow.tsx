import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { LearnerLesson } from "../api/learn-types";

/**
 * One lesson on the outline. State is said in words as well as shown (never colour alone), and a
 * locked lesson says what opens it, so the learner can see the whole road.
 */
export function OutlineLessonRow({
  subjectId,
  lesson,
}: {
  subjectId: string;
  lesson: LearnerLesson;
}) {
  const { t } = useTranslation();
  const base = `/learn/${subjectId}/lessons/${lesson.slug}`;
  const waiting = lesson.unlocksAfter.filter((unlock) => !unlock.passed);

  return (
    <li className="rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{lesson.title}</h3>
        <span className="rounded-full border px-2 py-0.5 text-xs">
          {t(`learn.state.${lesson.access}`)}
          {lesson.access === "in_progress" && lesson.paused
            ? ` · ${t("learn.state.paused")}`
            : ""}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
        {lesson.summary}
      </p>
      {lesson.covers.length > 0 && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {t("learn.covers", { list: lesson.covers.join(", ") })}
        </p>
      )}
      {lesson.stage === "testing" && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {t("learn.testingStage")}
        </p>
      )}
      {lesson.access === "locked" && (
        <p className="mt-2 text-sm">
          {t("learn.unlocksAfter", {
            list: waiting.map((unlock) => unlock.title).join(", "),
          })}
        </p>
      )}
      {lesson.access === "passed" && lesson.result && (
        <p className="mt-2 text-sm">
          {t("learn.firstTry", {
            right: lesson.result.first_try_right,
            total: lesson.result.total,
          })}
        </p>
      )}
      <div className="mt-3 flex gap-4 text-sm">
        {lesson.access === "available" && (
          <Link
            to={base}
            className="font-medium text-indigo-700 underline dark:text-indigo-300"
          >
            {t("learn.start")}
          </Link>
        )}
        {lesson.access === "in_progress" && (
          <Link
            to={base}
            className="font-medium text-indigo-700 underline dark:text-indigo-300"
          >
            {t("learn.continueLesson")}
          </Link>
        )}
        {lesson.access === "passed" && (
          <Link
            to={`${base}/read`}
            className="font-medium text-indigo-700 underline dark:text-indigo-300"
          >
            {t("learn.readAgain")}
          </Link>
        )}
      </div>
    </li>
  );
}
