import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";

export function CourseCatalogPage() {
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
  const title =
    source === "official" ? "Official Courses" : "Community Courses";
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex justify-between">
        <h1 className="text-3xl font-bold">{title}</h1>
        <Link to="/courses" className="text-sm text-indigo-600">
          My Courses
        </Link>
      </header>
      {loading && <p>Loading…</p>}
      {Boolean(error) && (
        <p role="alert" className="text-red-600">
          Could not load courses.
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              {enrollingId === course.id ? "Adding…" : "Add to My Courses"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
