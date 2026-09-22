import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";

export function CourseCatalogPage() {
  const { t } = useTranslation();
  const { source = "official" } = useParams<{
    source: "official" | "community";
  }>();
  const navigate = useNavigate();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const loadCourses = useCallback(() => api.learn.catalog(source), [source]);
  const {
    data: courses,
    loading,
    error,
  } = useAsync<LearnSubject[], []>(loadCourses, []);
  async function enroll(course: LearnSubject) {
    setEnrollingId(course.id);
    try {
      await api.learn.enroll(course.id);
      navigate(`/learn/${course.id}`);
    } finally {
      setEnrollingId(null);
    }
  }
  const title = t(
    source === "official"
      ? "libraryHub.officialCoursesTitle"
      : "libraryHub.communityCoursesTitle",
  );
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex justify-between">
        <h1 className="text-3xl font-bold">{title}</h1>
        <Link to="/library" className="text-sm text-indigo-600">
          {t("libraryHub.title")}
        </Link>
      </header>
      {loading && <p>{t("common.loading")}</p>}
      {Boolean(error) && (
        <p role="alert" className="text-red-600">
          {t("courseCatalog.loadError")}
        </p>
      )}
      <ul className="content-card-grid">
        {courses?.map((course) => (
          <li key={course.id} className="rounded-lg border p-4">
            <h2 className="font-medium">
              {course.title}
              {course.reference_number !== undefined && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  #{course.reference_number}
                </span>
              )}
            </h2>
            {course.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {course.description}
              </p>
            )}
            <button
              disabled={enrollingId === course.id}
              onClick={() => enroll(course)}
              className="mt-3 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {enrollingId === course.id
                ? t("courseCatalog.adding")
                : t("courseCatalog.add")}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
