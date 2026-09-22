import { useCallback } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";

/** /learn — the subjects you can learn, each opening on its outline. */
export function LearnPage() {
  const { t } = useTranslation();
  const load = useCallback(() => api.learn.subjects(), []);
  const { data, error, loading } = useAsync<LearnSubject[], []>(load, []);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/"
        className="mb-4 inline-block text-sm text-gray-700 dark:text-gray-300"
      >
        {t("learn.toDecks")}
      </Link>
      <h1 className="text-3xl font-bold">{t("learn.title")}</h1>
      <p className="mt-2 text-gray-700 dark:text-gray-300">
        {t("learn.intro")}
      </p>
      {loading && <p className="mt-6">{t("learn.loading")}</p>}
      {error != null && (
        <p role="alert" className="mt-6 text-red-700 dark:text-red-400">
          {error instanceof ApiError ? error.message : t("learn.loadError")}
        </p>
      )}
      {data && data.length === 0 && <p className="mt-6">{t("learn.empty")}</p>}
      <ul className="mt-6 space-y-3">
        {data?.map((subject) => (
          <li key={subject.id}>
            <Link
              to={`/learn/${subject.id}`}
              className="block rounded-xl border p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="block text-lg font-semibold">
                {subject.title}
                {subject.reference_number !== undefined && (
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                    #{subject.reference_number}
                  </span>
                )}
              </span>
              {subject.description && (
                <span className="block text-sm text-gray-700 dark:text-gray-300">
                  {subject.description}
                </span>
              )}
              <span className="block text-xs text-gray-600 dark:text-gray-400">
                {t("learn.conceptCount", { count: subject.concept_count })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
