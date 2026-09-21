import { useCallback } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { CourseSummary } from "../api/types";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";
import { CourseListItem } from "./CourseListItem";

interface MyCourses {
  deckCourses: CourseSummary[];
  lessonCourses: LearnSubject[];
}

/** Shows both course engines without asking a learner to know the difference. */
export function MyCoursesPage() {
  const { t } = useTranslation();
  const loadMyCourses = useCallback(async (): Promise<MyCourses> => {
    const [deckCourses, lessonCourses] = await Promise.all([
      api.courses.list(),
      api.learn.subjects(),
    ]);
    return { deckCourses, lessonCourses };
  }, []);
  const {
    data: myCourses,
    error,
    loading,
  } = useAsync<MyCourses, []>(loadMyCourses, []);
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("courses.loadError")
        : null;

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("courses.myCoursesTitle")}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("courses.myCoursesIntro")}
          </p>
        </div>
        <nav
          aria-label="Course library"
          className="flex gap-3 text-sm text-indigo-600"
        >
          <Link to="/library/courses/official">Official Courses</Link>
          <Link to="/library/courses/community">Community Courses</Link>
          <Link to="/">{t("courses.myDecks")}</Link>
        </nav>
      </header>
      {loading && <p>{t("common.loading")}</p>}
      {errorMessage && (
        <p role="alert" className="text-red-600">
          {errorMessage}
        </p>
      )}
      {myCourses && !errorMessage && (
        <>
          <section aria-labelledby="lesson-courses-heading">
            <h2
              id="lesson-courses-heading"
              className="mb-3 text-xl font-semibold"
            >
              {t("courses.lessonCourses")}
            </h2>
            {myCourses.lessonCourses.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("courses.noLessonCourses")}
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {myCourses.lessonCourses.map((course) => (
                  <li key={course.id} className="rounded-lg border p-4">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                      {t("courses.lessonCourseBadge")}
                    </span>
                    <h3 className="mt-2 font-medium">
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
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t("learn.conceptCount", { count: course.concept_count })}
                    </p>
                    <Link
                      to={`/learn/${course.id}`}
                      className="mt-3 inline-block text-sm text-indigo-600"
                    >
                      {t("courses.open")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="deck-courses-heading" className="mt-8">
            <h2
              id="deck-courses-heading"
              className="mb-3 text-xl font-semibold"
            >
              {t("courses.deckCourses")}
            </h2>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {t("courses.deckCoursesIntro")}
            </p>
            {myCourses.deckCourses.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("courses.empty")}
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {myCourses.deckCourses.map((course) => (
                  <CourseListItem key={course.id} course={course} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
