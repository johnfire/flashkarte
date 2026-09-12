import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, reportClientError } from "../api/client";
import { DeckCollection } from "../api/types";

interface CollectionRowProps {
  collection: DeckCollection;
}

/** One collection row on the App Decks page: title, count, and a bulk Add all. */
export function CollectionRow({ collection: c }: CollectionRowProps) {
  const { t } = useTranslation();
  const [addingAll, setAddingAll] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  async function onAddAll() {
    setAddingAll(true);
    try {
      await api.decks.subscribeAllInCollection(c.id);
      setAddedAll(true);
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "CollectionRow.onAddAll",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setAddingAll(false);
    }
  }

  return (
    <li className="flex items-center justify-between rounded-lg border p-4">
      <div className="min-w-0">
        <Link to={`/app-decks/${c.id}`} className="font-medium hover:underline">
          {c.title}
        </Link>
        {c.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {c.description}
          </p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("decks.deckCount", { count: c.deck_count })}
        </p>
      </div>
      <button
        onClick={onAddAll}
        disabled={addingAll || addedAll}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {addedAll
          ? t("decks.addedAll")
          : addingAll
            ? t("decks.adding")
            : t("decks.addAll")}
      </button>
    </li>
  );
}
