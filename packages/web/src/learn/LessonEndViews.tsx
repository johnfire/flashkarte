import { Link } from "react-router";
import { useTranslation } from "react-i18next";

/** The lesson is passed: how it went, and what it opened. */
export function PassedView({
  subjectId,
  firstTryRight,
  total,
  unlocked,
}: {
  subjectId: string;
  firstTryRight: number;
  total: number;
  unlocked: { slug: string; title: string }[];
}) {
  const { t } = useTranslation();
  return (
    <article className="rounded-xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{t("learn.passedTitle")}</h2>
      <p className="mt-2">
        {t("learn.passedResult", { right: firstTryRight, total })}
      </p>
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        {t("learn.passedReviewNote")}
      </p>
      {unlocked.length > 0 && (
        <div className="mt-4">
          <p className="font-medium">{t("learn.nowOpen")}</p>
          <ul className="mt-1 list-disc pl-6">
            {unlocked.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  to={`/learn/${subjectId}/lessons/${lesson.slug}`}
                  className="text-indigo-700 underline dark:text-indigo-300"
                >
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link
        to={`/learn/${subjectId}`}
        className="mt-6 block rounded-lg bg-indigo-600 py-3 text-center font-medium text-white"
      >
        {t("learn.toOutline")}
      </Link>
    </article>
  );
}

/** Saved and set aside: the lesson stays not passed, so what depends on it stays locked. */
export function PausedView({
  subjectId,
  onResume,
}: {
  subjectId: string;
  onResume: () => void;
}) {
  const { t } = useTranslation();
  return (
    <article className="rounded-xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{t("learn.pausedTitle")}</h2>
      <p className="mt-2">{t("learn.pausedBody")}</p>
      <div className="mt-6 flex gap-3">
        <Link
          to={`/learn/${subjectId}`}
          className="rounded-lg border px-6 py-3"
        >
          {t("learn.toOutline")}
        </Link>
        <button
          type="button"
          onClick={onResume}
          className="flex-1 rounded-lg bg-indigo-600 py-3 font-medium text-white"
        >
          {t("learn.resume")}
        </button>
      </div>
    </article>
  );
}

/** Shown from the second miss: the honest options. "I need more on this" arrives with help requests. */
export function StuckNote({
  onPause,
  more,
}: {
  onPause: () => void;
  /** The "I need more on this" control for the question, when there is one. */
  more?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-6 rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm dark:bg-amber-950">
      <p>{t("learn.stuckNote")}</p>
      <button
        type="button"
        onClick={onPause}
        className="mt-2 text-indigo-700 underline dark:text-indigo-300"
      >
        {t("learn.comeBackLater")}
      </button>
      {more}
    </div>
  );
}
