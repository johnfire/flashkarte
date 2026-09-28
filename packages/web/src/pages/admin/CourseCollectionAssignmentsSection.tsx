import { useCallback, useState } from "react";
import { ApiError, api } from "../../api/client";
import type {
  CourseCollectionSummary,
  LearnSubject,
} from "../../api/learn-types";
import { useAsync } from "../../hooks/use-async";
import {
  COURSE_COLLECTION_PLANS,
  type CourseCollectionPlan,
} from "./course-collection-plans";

interface CourseOrganization {
  courses: LearnSubject[];
  collections: CourseCollectionSummary[];
}

/** Admin controls for arranging the current account's authored course families. */
export function CourseCollectionAssignmentsSection() {
  const loadCourseOrganization = useCallback(async () => {
    const [courses, officialCollections, communityCollections] =
      await Promise.all([
        api.learn.subjects(),
        api.courseCollections.list("official"),
        api.courseCollections.list("community"),
      ]);
    return {
      courses,
      collections: [...officialCollections, ...communityCollections],
    };
  }, []);
  const {
    data: courseOrganization,
    error: loadError,
    loading,
    setData: setCourseOrganization,
  } = useAsync<CourseOrganization, []>(loadCourseOrganization, []);
  const [organizingTitle, setOrganizingTitle] = useState<string | null>(null);
  const [organizationError, setOrganizationError] = useState<string | null>(
    null,
  );
  const [organizationMessage, setOrganizationMessage] = useState<string | null>(
    null,
  );

  async function organizeCourses(plan: CourseCollectionPlan) {
    const currentOrganization = courseOrganization;
    const courses = currentOrganization?.courses
      .filter(plan.matchesCourse)
      .sort(plan.sortCourses);
    if (!currentOrganization || !courses?.length) return;

    setOrganizingTitle(plan.title);
    setOrganizationError(null);
    setOrganizationMessage(null);
    try {
      const existingCollection = currentOrganization.collections.find(
        (collection) => collection.title === plan.title,
      );
      const collection =
        existingCollection ??
        (await api.admin.createCourseCollection(
          plan.title,
          plan.description,
          plan.isOfficial,
        ));
      await api.admin.setCourseCollectionMembers(
        collection.id,
        courses.map((course) => course.id),
      );
      setCourseOrganization((currentOrganization) => {
        if (!currentOrganization) return currentOrganization;
        return {
          collections: existingCollection
            ? currentOrganization.collections
            : [...currentOrganization.collections, collection],
          courses: currentOrganization.courses.map((course) => {
            const position = courses.findIndex(
              (candidate) => candidate.id === course.id,
            );
            return position < 0
              ? course
              : {
                  ...course,
                  course_collection_id: collection.id,
                  course_collection_position: position,
                  course_collection_title: collection.title,
                };
          }),
        };
      });
      setOrganizationMessage(
        `${plan.title}: ${courses.length} courses organized.`,
      );
    } catch (failure) {
      setOrganizationError(
        failure instanceof ApiError
          ? failure.message
          : `Could not organize ${plan.title}.`,
      );
    } finally {
      setOrganizingTitle(null);
    }
  }

  const errorMessage =
    organizationError ??
    (loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? "Could not load course collections."
        : null);

  return (
    <section
      className="rounded-lg border p-4"
      aria-labelledby="course-collections-heading"
    >
      <h2
        id="course-collections-heading"
        className="mb-2 text-xl font-semibold"
      >
        Course collections
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        Group the authored course families that learners see in My Courses.
      </p>
      {loading && <p className="text-sm">Loading course families…</p>}
      {errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      {organizationMessage && (
        <p role="status" className="text-sm text-green-600">
          {organizationMessage}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {COURSE_COLLECTION_PLANS.map((plan) => {
          const courseCount =
            courseOrganization?.courses.filter(plan.matchesCourse).length ?? 0;
          return (
            <li
              key={plan.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <h3 className="font-medium">{plan.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {courseCount} course{courseCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                disabled={courseCount === 0 || organizingTitle !== null}
                onClick={() => void organizeCourses(plan)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-60"
              >
                {organizingTitle === plan.title ? "Organizing…" : "Organize"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
