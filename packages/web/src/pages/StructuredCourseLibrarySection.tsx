import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";

type CourseSource = "official" | "community";

interface StructuredCourseLibrarySectionProps {
  source: CourseSource;
}

function catalogPath(source: CourseSource) {
  return `/library/courses/${source}`;
}

function titleKey(source: CourseSource) {
  return source === "official"
    ? "libraryHub.officialCoursesTitle"
    : "libraryHub.communityCoursesTitle";
}

function detailKey(source: CourseSource) {
  return source === "official"
    ? "libraryHub.officialCoursesDetail"
    : "libraryHub.communityCoursesDetail";
}

/** A directly-browsable structured-course catalogue section in the Library. */
export function StructuredCourseLibrarySection({
  source,
}: StructuredCourseLibrarySectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const loadCourses = useCallback(() => api.learn.catalog(source), [source]);
  const {
    data: courses,
    error,
    loading,
  } = useAsync<LearnSubject[], []>(loadCourses, []);

  async function enroll(course: LearnSubject) {
    setEnrollingId(course.id);
    setEnrollError(null);
    try {
      await api.learn.enroll(course.id);
      navigate(`/learn/${course.id}`);
    } catch (enrollmentError) {
      reportClientError({
        message:
          enrollmentError instanceof Error
            ? enrollmentError.message
            : String(enrollmentError),
        context: "StructuredCourseLibrarySection.enroll",
      });
      setEnrollError(
        enrollmentError instanceof ApiError
          ? enrollmentError.message
          : t("courseCatalog.loadError"),
      );
    } finally {
      setEnrollingId(null);
    }
  }

  const loadError =
    error instanceof ApiError
      ? error.message
      : error
        ? t("courseCatalog.loadError")
        : null;

  return (
    <section aria-labelledby={`${source}-structured-courses-heading`}>
      <header className="mb-3">
        <h2
          id={`${source}-structured-courses-heading`}
          className="text-xl font-semibold"
        >
          <Link to={catalogPath(source)} className="hover:underline">
            {t(titleKey(source))}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t(detailKey(source))}
        </p>
      </header>
      {loading && <p>{t("common.loading")}</p>}
      {loadError && (
        <p role="alert" className="text-red-600">
          {loadError}
        </p>
      )}
      {enrollError && (
        <p role="alert" className="mt-2 text-red-600">
          {enrollError}
        </p>
      )}
      {courses?.length === 0 && !loadError && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("libraryHub.emptyCourses")}
        </p>
      )}
      <ul className="content-card-grid">
        {courses?.map((course) => (
          <li key={course.id} className="rounded-lg border p-4">
            <h3 className="font-medium">
              {course.title}
              {course.reference_number !== undefined && (
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  #{course.reference_number}
                </span>
              )}
            </h3>
            {course.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {course.description}
              </p>
            )}
            <button
              disabled={enrollingId === course.id}
              onClick={() => void enroll(course)}
              className="mt-3 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {enrollingId === course.id
                ? t("courseCatalog.adding")
                : t("courseCatalog.add")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
