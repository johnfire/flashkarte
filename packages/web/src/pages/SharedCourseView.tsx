import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { CourseDetail } from "../api/types";
import { CourseDeckRow } from "./CourseDeckRow";

/**
 * A deck-course someone shared with the learner: they can add it, study its
 * decks in order once added, and remove it — never change it.
 */
export function SharedCourseView({
  course,
  onChanged,
}: {
  course: CourseDetail;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (course.subscribed) await api.courses.unsubscribe(course.id);
      else await api.courses.subscribe(course.id);
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("decks.addError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link to="/courses" className="text-indigo-600">
          {t("courses.backToCourses")}
        </Link>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          className={
            course.subscribed
              ? "text-red-600 disabled:opacity-60"
              : "rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-60"
          }
        >
          {course.subscribed ? t("decks.remove") : t("decks.add")}
        </button>
      </div>
      <h1 className="mb-1 text-2xl font-bold">
        {course.title}
        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 align-middle text-xs font-medium text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
          {t("decks.sharedWithYou")}
        </span>
      </h1>
      {course.description && (
        <p className="mb-2 text-gray-600 dark:text-gray-400">
          {course.description}
        </p>
      )}
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {course.subscribed
          ? t("courses.sharedReadOnly")
          : t("courses.sharedAddFirst")}
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="content-card-grid">
        {course.decks.map((d) => (
          <CourseDeckRow key={d.deck_id} deck={d} />
        ))}
      </ul>
    </div>
  );
}
