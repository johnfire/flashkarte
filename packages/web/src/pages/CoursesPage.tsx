import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { CourseSummary } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CourseListItem } from "./CourseListItem";

export function CoursesPage() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadCourses = useCallback(() => api.courses.list(), []);
  const {
    data: courses,
    error: loadError,
    loading,
    setData: setCourses,
  } = useAsync<CourseSummary[], []>(loadCourses, []);
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("courses.loadError")
        : null;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError(null);
    try {
      const course = await api.courses.create(trimmed);
      setCourses((c) => [
        { ...course, decks_total: 0, decks_mastered: 0 },
        ...(c ?? []),
      ]);
      setTitle("");
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : t("courses.createError"),
      );
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: string, courseTitle: string) {
    if (!window.confirm(t("courses.deleteConfirm", { title: courseTitle })))
      return;
    try {
      await api.courses.remove(id);
      setCourses((c) => (c ? c.filter((x) => x.id !== id) : c));
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "CoursesPage.onDelete",
      });
      window.alert(t("courses.deleteError"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("courses.title")}</h1>
        <div className="flex gap-4 text-sm">
          <Link to="/library/courses" className="text-indigo-600">
            {t("courses.browsePublic")}
          </Link>
          <Link to="/" className="text-indigo-600">
            {t("courses.myDecks")}
          </Link>
        </div>
      </header>

      <form onSubmit={onCreate} className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("courses.newTitlePlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {t("courses.newCourse")}
        </button>
      </form>
      {createError && <p className="mb-4 text-red-600">{createError}</p>}

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {courses && courses.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400">{t("courses.empty")}</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => (
          <CourseListItem key={c.id} course={c} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
