import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import type { SharedDeck, ShareScope } from "../api/types";
import { useAsync } from "../hooks/use-async";

const SOURCE_KEY: Record<ShareScope, string> = {
  school: "decks.sharedFrom.school",
  teacher_students: "decks.sharedFrom.teacher",
  class: "decks.sharedFrom.class",
};

interface SharedWithMeSectionProps {
  // Called after a deck is added, so the page reloads "My Decks".
  onAdded: () => void;
}

/**
 * Decks a school, teacher or classmate shared with the user that they have
 * not added yet. Renders nothing when there are none, so individual
 * accounts never see it. A failure here hides the section and never breaks
 * the deck list around it.
 */
export function SharedWithMeSection({ onAdded }: SharedWithMeSectionProps) {
  const { t } = useTranslation();
  const load = useCallback(async () => {
    try {
      return (await api.decks.listShared()).decks;
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "SharedWithMeSection.load",
      });
      return [];
    }
  }, []);
  const { data, setData } = useAsync<SharedDeck[], []>(load, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const waiting = data?.filter((deck) => !deck.subscribed) ?? [];
  if (waiting.length === 0) return null;

  async function add(deck: SharedDeck) {
    setBusyId(deck.id);
    setError(null);
    try {
      await api.decks.subscribe(deck.id);
      setData((current) =>
        current
          ? current.map((d) =>
              d.id === deck.id ? { ...d, subscribed: true } : d,
            )
          : current,
      );
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
    <section className="mb-6 rounded-lg border border-sky-200 p-4 dark:border-sky-800">
      <h2 className="mb-1 text-xl font-semibold">{t("decks.sharedTitle")}</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        {t("decks.sharedHint")}
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {waiting.map((deck) => (
          <li
            key={deck.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{deck.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("decks.cardCount", { count: deck.cardCount })}
                {" · "}
                {deck.scopes.map((scope) => t(SOURCE_KEY[scope])).join(", ")}
                {deck.author && ` · ${deck.author}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void add(deck)}
              disabled={busyId === deck.id}
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
