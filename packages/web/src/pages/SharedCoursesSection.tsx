import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import type { ShareScope, SharedCourse, SharedSubject } from "../api/types";
import { useAsync } from "../hooks/use-async";

const SOURCE_KEY: Record<ShareScope, string> = {
  school: "decks.sharedFrom.school",
  teacher_students: "decks.sharedFrom.teacher",
  class: "decks.sharedFrom.class",
};

interface Waiting {
  kind: "deckCourse" | "lessonCourse";
  id: string;
  title: string;
  author: string | null;
  scopes: ShareScope[];
}

/** One list failing never hides the other, nor breaks the page around it. */
async function loadSafely<T>(load: () => Promise<T[]>, context: string) {
  try {
    return await load();
  } catch (err) {
    reportClientError({
      message: err instanceof Error ? err.message : String(err),
      context,
    });
    return [];
  }
}

/**
 * Deck-courses and structured courses a school, teacher or classmate shared
 * with the user that they have not added yet. Renders nothing when there are
 * none.
 */
export function SharedCoursesSection({ onAdded }: { onAdded: () => void }) {
  const { t } = useTranslation();
  const load = useCallback(async (): Promise<Waiting[]> => {
    const [courses, subjects] = await Promise.all([
      loadSafely<SharedCourse>(
        async () => (await api.courses.listShared()).courses,
        "SharedCoursesSection.courses",
      ),
      loadSafely<SharedSubject>(
        async () => (await api.learn.listShared()).courses,
        "SharedCoursesSection.subjects",
      ),
    ]);
    return [
      ...subjects
        .filter((s) => !s.enrolled)
        .map((s) => ({ kind: "lessonCourse" as const, ...s })),
      ...courses
        .filter((c) => !c.subscribed)
        .map((c) => ({ kind: "deckCourse" as const, ...c })),
    ];
  }, []);
  const { data, setData } = useAsync<Waiting[], []>(load, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data || data.length === 0) return null;

  async function add(item: Waiting) {
    setBusyId(item.id);
    setError(null);
    try {
      if (item.kind === "lessonCourse") await api.learn.enroll(item.id);
      else await api.courses.subscribe(item.id);
      setData((current) => current?.filter((x) => x.id !== item.id) ?? null);
      onAdded();
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("decks.addError"),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-8 rounded-lg border border-sky-200 p-4 dark:border-sky-800">
      <h2 className="mb-1 text-xl font-semibold">{t("courses.sharedTitle")}</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        {t("courses.sharedHint")}
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {data.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(
                  item.kind === "lessonCourse"
                    ? "courses.lessonCourseBadge"
                    : "courses.deckCourses",
                )}
                {" · "}
                {item.scopes.map((scope) => t(SOURCE_KEY[scope])).join(", ")}
                {item.author && ` · ${item.author}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void add(item)}
              disabled={busyId === item.id}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {t("decks.add")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
