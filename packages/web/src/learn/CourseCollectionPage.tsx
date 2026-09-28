import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { useAsync } from "../hooks/use-async";
import {
  CourseProgressBadge,
  courseProgressCardClass,
} from "./LearnCourseCard";

/** The courses a learner has access to inside one Course Collection. */
export function CourseCollectionPage() {
  const { t } = useTranslation();
  const { collectionId } = useParams();
  const {
    data: courses,
    error,
    loading,
  } = useAsync(() => api.learn.subjects(), []);
  const collectionCourses = courses?.filter(
    (course) => course.course_collection_id === collectionId,
  );
  const collectionTitle = collectionCourses?.[0]?.course_collection_title;
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("learn.loadError")
        : null;

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <Link to="/learn" className="text-sm text-indigo-600">
        {t("courseCollections.backToMyCourses")}
      </Link>
      <h1 className="mt-3 text-3xl font-bold">
        {collectionTitle ?? t("courseCollections.title")}
      </h1>
      {loading && <p className="mt-6">{t("common.loading")}</p>}
      {errorMessage && (
        <p role="alert" className="mt-6 text-red-600">
          {errorMessage}
        </p>
      )}
      {collectionCourses && collectionCourses.length === 0 && (
        <p className="mt-6">{t("courseCollections.emptyMine")}</p>
      )}
      <ul className="mt-6 content-card-grid">
        {collectionCourses?.map((course) => (
          <li
            key={course.id}
            className={`rounded-xl ${courseProgressCardClass(course.course_progress)}`}
          >
            <Link
              to={`/learn/${course.id}`}
              className="block rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <h2 className="text-lg font-semibold">
                {course.title}
                <CourseProgressBadge progress={course.course_progress} />
              </h2>
              {course.description && (
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {course.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {t("learn.conceptCount", { count: course.concept_count })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
