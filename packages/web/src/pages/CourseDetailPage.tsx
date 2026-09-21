import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { CourseDetail, DeckWithCounts } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CourseDeckRow } from "./CourseDeckRow";

export function CourseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [ownDecks, setOwnDecks] = useState<DeckWithCounts[] | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const loadCourse = useCallback(() => api.courses.get(id!), [id]);
  const {
    data: course,
    error: loadError,
    loading,
    setData: setCourse,
  } = useAsync<CourseDetail, []>(loadCourse, []);
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("courses.loadError")
        : null;

  useEffect(() => {
    api.decks.list().then(setOwnDecks, () => setOwnDecks([]));
  }, []);

  async function onAddDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeckId || !course) return;
    setAddError(null);
    try {
      await api.courses.addDeck(course.id, selectedDeckId);
      const updated = await api.courses.get(course.id);
      setCourse(updated);
      setSelectedDeckId("");
    } catch (err) {
      setAddError(
        err instanceof ApiError ? err.message : t("courses.addDeckError"),
      );
    }
  }

  async function onRemoveDeck(deckId: string, title: string) {
    if (!course) return;
    if (!window.confirm(t("courses.removeDeckConfirm", { title }))) return;
    try {
      await api.courses.removeDeck(course.id, deckId);
      setCourse((c) =>
        c ? { ...c, decks: c.decks.filter((d) => d.deck_id !== deckId) } : c,
      );
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "CourseDetailPage.onRemoveDeck",
      });
      window.alert(t("courses.removeDeckError"));
    }
  }

  async function onTogglePublic() {
    if (!course) return;
    const next = !course.is_public;
    setCourse((c) => (c ? { ...c, is_public: next } : c));
    try {
      await api.courses.setPublic(course.id, next);
    } catch {
      setCourse((c) => (c ? { ...c, is_public: !next } : c));
      window.alert(t("courses.togglePublicError"));
    }
  }

  async function onDelete() {
    if (!course) return;
    if (!window.confirm(t("courses.deleteConfirm", { title: course.title })))
      return;
    try {
      await api.courses.remove(course.id);
      navigate("/courses");
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "CourseDetailPage.onDelete",
      });
      window.alert(t("courses.deleteError"));
    }
  }

  if (error) return <p className="p-8 text-center text-red-600">{error}</p>;
  if (loading || !course) {
    return (
      <p className="p-8 text-center text-gray-500 dark:text-gray-400">
        {t("common.loading")}
      </p>
    );
  }

  const availableDecks = (ownDecks ?? []).filter(
    (d) => !course.decks.some((cd) => cd.deck_id === d.id),
  );

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link to="/courses" className="text-indigo-600">
          {t("courses.backToCourses")}
        </Link>
        <div className="flex gap-3">
          <button onClick={onTogglePublic} className="text-indigo-600">
            {course.is_public ? t("decks.unshare") : t("courses.publish")}
          </button>
          <button onClick={onDelete} className="text-red-600">
            {t("decks.delete")}
          </button>
        </div>
      </div>

      <h1 className="mb-1 text-2xl font-bold">
        {course.title}
        {course.reference_number !== undefined && (
          <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
            #{course.reference_number}
          </span>
        )}
      </h1>
      {course.description && (
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          {course.description}
        </p>
      )}

      <ul className="mb-6 space-y-3">
        {course.decks.map((d) => (
          <CourseDeckRow key={d.deck_id} deck={d} onRemove={onRemoveDeck} />
        ))}
        {course.decks.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("courses.noDecks")}
          </p>
        )}
      </ul>

      {availableDecks.length > 0 && (
        <form onSubmit={onAddDeck} className="flex gap-2">
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2"
          >
            <option value="">{t("courses.addDeckPlaceholder")}</option>
            {availableDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedDeckId}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {t("courses.addDeck")}
          </button>
        </form>
      )}
      {addError && <p className="mt-2 text-red-600">{addError}</p>}
    </div>
  );
}
