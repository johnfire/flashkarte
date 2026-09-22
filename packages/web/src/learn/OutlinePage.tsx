import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LearnerOutline } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";
import { OutlineLessonRow } from "./OutlineLessonRow";

/** /learn/:subjectId — what you are going to learn, in order, and where you are in it. */
export function OutlinePage() {
  const { t } = useTranslation();
  const { subjectId } = useParams<{ subjectId: string }>();
  const load = useCallback(() => api.learn.outline(subjectId!), [subjectId]);
  const { data, error, loading } = useAsync<LearnerOutline, []>(load, []);
  const lessonCount =
    data?.modules.reduce((sum, m) => sum + m.lessons.length, 0) ?? 0;

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <Link
        to="/learn"
        className="mb-4 inline-block text-sm text-gray-700 dark:text-gray-300"
      >
        {t("learn.toLearn")}
      </Link>
      {loading && <p>{t("learn.loading")}</p>}
      {error != null && (
        <p role="alert" className="text-red-700 dark:text-red-400">
          {error instanceof ApiError ? error.message : t("learn.loadError")}
        </p>
      )}
      {data && (
        <>
          <h1 className="text-3xl font-bold">{data.subject_title}</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            {t("learn.outlineIntro")}
          </p>
          {data.reviews_due > 0 && (
            <Link
              to={`/learn/${subjectId}/reviews`}
              className="mt-4 block rounded-xl border border-indigo-500 p-4 font-medium"
            >
              {t("learn.reviewsDue", { count: data.reviews_due })}
            </Link>
          )}
          {lessonCount === 0 && <p className="mt-6">{t("learn.noLessons")}</p>}
          {data.modules.map((module, index) => (
            <section
              key={module.id ?? `none-${index}`}
              className="mt-8"
              aria-labelledby={`module-${index}`}
            >
              <h2 id={`module-${index}`} className="mb-3 text-xl font-semibold">
                {module.title ?? t("learn.otherLessons")}
              </h2>
              <ol className="content-card-grid">
                {module.lessons.map((lesson) => (
                  <OutlineLessonRow
                    key={lesson.id}
                    subjectId={subjectId!}
                    lesson={lesson}
                  />
                ))}
              </ol>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
