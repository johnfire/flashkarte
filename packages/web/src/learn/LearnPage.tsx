import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";
import { useAuth } from "../auth/AuthContext";

/** /learn — the real courses a learner owns or has added, each opening on its outline. */
export function LearnPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const load = useCallback(() => api.learn.subjects(), []);
  const { data, error, loading, setData } = useAsync<LearnSubject[], []>(
    load,
    [],
  );
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharingError, setSharingError] = useState<string | null>(null);

  async function toggleCommunitySharing(course: LearnSubject) {
    setSharingId(course.id);
    setSharingError(null);
    try {
      const updated = await api.learn.setPublic(course.id, !course.is_public);
      setData((courses) =>
        courses
          ? courses.map((existing) =>
              existing.id === course.id
                ? { ...existing, is_public: updated.is_public }
                : existing,
            )
          : null,
      );
    } catch (failure) {
      setSharingError(
        failure instanceof ApiError ? failure.message : t("learn.shareError"),
      );
    } finally {
      setSharingId(null);
    }
  }

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
      {sharingError && (
        <p role="alert" className="mt-4 text-red-700 dark:text-red-400">
          {sharingError}
        </p>
      )}
      {data && data.length === 0 && <p className="mt-6">{t("learn.empty")}</p>}
      <ul className="mt-6 space-y-3">
        {data?.map((subject) => (
          <li key={subject.id} className="rounded-xl border">
            <Link
              to={`/learn/${subject.id}`}
              className="block rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="block text-lg font-semibold">
                {subject.title}
                {subject.reference_number !== undefined && (
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                    #{subject.reference_number}
                  </span>
                )}
                {subject.is_official && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    {t("learn.official")}
                  </span>
                )}
                {subject.is_public && !subject.is_official && (
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    {t("learn.community")}
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
            {subject.user_id === user?.id && !subject.is_official && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => void toggleCommunitySharing(subject)}
                  disabled={sharingId === subject.id}
                  className="text-sm text-indigo-600 disabled:opacity-60"
                >
                  {sharingId === subject.id
                    ? t("learn.sharing")
                    : subject.is_public
                      ? t("learn.unshare")
                      : t("learn.share")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
