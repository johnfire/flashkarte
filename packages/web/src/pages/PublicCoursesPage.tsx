import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { PublicCourseSummary } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { PublicDeckCollectionRow } from "./PublicDeckCollectionRow";

export function PublicCoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const loadCourses = useCallback(() => api.publicCourses.list(), []);
  const {
    data: courses,
    error: loadError,
    loading,
  } = useAsync<PublicCourseSummary[], []>(loadCourses, []);
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("courses.loadError")
        : null;

  async function onClone(id: string) {
    setCloningId(id);
    setCloneError(null);
    try {
      const result = await api.publicCourses.clone(id);
      navigate(`/courses/${result.course.id}`);
    } catch (err) {
      setCloneError(
        err instanceof ApiError ? err.message : t("courses.cloneError"),
      );
      setCloningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("courses.browsePublic")}</h1>
        <Link to="/library/community/decks" className="text-sm text-indigo-600">
          {t("courses.backToCourses")}
        </Link>
      </header>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {cloneError && <p className="mb-4 text-red-600">{cloneError}</p>}
      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {courses && courses.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("courses.noPublicCourses")}
        </p>
      )}

      <ul className="space-y-3">
        {courses?.map((course) => (
          <PublicDeckCollectionRow
            key={course.id}
            collection={course}
            busy={cloningId === course.id}
            onClone={onClone}
          />
        ))}
      </ul>
    </div>
  );
}
