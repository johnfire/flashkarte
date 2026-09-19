import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LessonScreens } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";
import { LessonBlocks } from "./LessonBlocks";
import { ScreenOrigin } from "./ScreenOrigin";

/** /learn/:subjectId/lessons/:slug/read — every screen of a lesson, for looking back after passing it. */
export function ReadLessonPage() {
  const { t } = useTranslation();
  const { subjectId, slug } = useParams<{ subjectId: string; slug: string }>();
  const load = useCallback(
    () => api.learn.screens(subjectId!, slug!),
    [subjectId, slug],
  );
  const { data, error, loading } = useAsync<LessonScreens, []>(load, []);
  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to={`/learn/${subjectId}`}
        className="mb-4 inline-block text-sm text-gray-700 dark:text-gray-300"
      >
        {t("learn.toOutlineArrow")}
      </Link>
      {loading && <p>{t("learn.loading")}</p>}
      {error != null && (
        <p role="alert">
          {error instanceof ApiError ? error.message : t("learn.loadError")}
        </p>
      )}
      {data && (
        <>
          <h1 className="mb-6 text-2xl font-bold">{data.lesson.title}</h1>
          <div className="space-y-8">
            {data.screens.map((screen) => (
              <section
                key={screen.number}
                aria-label={t("learn.screenNumber", { number: screen.number })}
                className="rounded-xl border p-6"
              >
                <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                  {t("learn.screenNumber", { number: screen.number })}
                </p>
                <LessonBlocks blocks={screen.blocks} />
                <ScreenOrigin
                  addedInAnswer={screen.added_in_answer}
                  sources={screen.sources}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
