import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { StudyCard } from "../api/types";

const RATINGS = [
  { value: 1, labelKey: "again", className: "bg-red-600" },
  { value: 3, labelKey: "hard", className: "bg-amber-600" },
  { value: 4, labelKey: "good", className: "bg-green-600" },
  { value: 5, labelKey: "easy", className: "bg-emerald-600" },
];

export function StudyPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [cards, setCards] = useState<StudyCard[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setCards(await api.study.batch(id));
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "StudyPage.load",
      });
      setError(err instanceof ApiError ? err.message : t("study.loadError"));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function grade(rating: number) {
    if (!cards) return;
    const card = cards[idx];
    try {
      await api.study.review(card.id, rating);
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "StudyPage.grade",
      });
      window.alert(t("study.saveReviewError"));
      return;
    }
    setReviewed((n) => n + 1);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Link to="/" className="text-indigo-600">
          {t("study.backToDecks")}
        </Link>
      </div>
    );
  }

  if (cards === null) {
    return (
      <p className="p-8 text-center text-gray-500 dark:text-gray-400">
        {t("study.loading")}
      </p>
    );
  }

  const done = idx >= cards.length;
  if (done) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">{t("study.complete")}</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          {reviewed === 0
            ? t("study.nothingDue")
            : t("study.reviewed", { count: reviewed })}
        </p>
        <Link
          to="/"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {t("study.backToDecks")}
        </Link>
      </div>
    );
  }

  const card = cards[idx];
  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="text-indigo-600">
          {t("study.decks")}
        </Link>
        <span>
          {t("study.progress", { current: idx + 1, total: cards.length })}
        </span>
      </div>

      <div className="rounded-xl border p-8 shadow-sm">
        {card.category && (
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {card.category}
          </p>
        )}
        <p className="text-lg font-medium">{card.content.front}</p>
        {revealed && (
          <p className="mt-6 whitespace-pre-wrap border-t pt-6 text-gray-700 dark:text-gray-300">
            {card.content.back}
          </p>
        )}
      </div>

      <div className="mt-6">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
          >
            {t("study.showAnswer")}
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => grade(r.value)}
                className={`rounded-lg ${r.className} py-3 text-sm font-medium text-white`}
              >
                {t(`study.${r.labelKey}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
