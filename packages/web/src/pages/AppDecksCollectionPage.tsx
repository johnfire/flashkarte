import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError, BrowseParams } from "../api/client";
import { OfficialDeck } from "../api/types";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { OfficialDeckRow } from "./OfficialDeckRow";

export function AppDecksCollectionPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState("");
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  const loadDecks = useCallback(
    async (params: BrowseParams) => {
      const collection = await api.decks.getCollection(id!, params);
      setTitle(collection.title);
      setDescription(collection.description);
      return collection.decks;
    },
    [id],
  );
  const decks = usePaginatedList<OfficialDeck>(loadDecks);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void decks.search(q);
  }

  async function onAdd(deckId: string) {
    setSubscribingId(deckId);
    try {
      await api.decks.subscribe(deckId);
      decks.setItems(
        (list) =>
          list?.map((d) =>
            d.id === deckId ? { ...d, subscribed: true } : d,
          ) ?? list,
      );
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "AppDecksCollectionPage.onAdd",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setSubscribingId(null);
    }
  }

  async function onAddAll() {
    setAddingAll(true);
    try {
      await api.decks.subscribeAllInCollection(id!);
      decks.setItems(
        (list) => list?.map((d) => ({ ...d, subscribed: true })) ?? list,
      );
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "AppDecksCollectionPage.onAddAll",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setAddingAll(false);
    }
  }

  const errorMessage =
    decks.error instanceof ApiError
      ? decks.error.message
      : decks.error
        ? t("decks.loadError")
        : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6">
        <Link
          to="/app-decks"
          className="mb-2 inline-block text-sm text-gray-500 dark:text-gray-400"
        >
          {t("decks.backToAppDecks")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {title ?? t("common.loading")}
            </h1>
            {description && (
              <p className="text-gray-600 dark:text-gray-300">{description}</p>
            )}
          </div>
          <button
            onClick={onAddAll}
            disabled={addingAll}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {addingAll ? t("decks.adding") : t("decks.addAll")}
          </button>
        </div>
      </header>

      <form onSubmit={onSearchSubmit} className="mb-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("decks.appDecksSearchPlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {t("library.search")}
        </button>
      </form>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}
      {decks.loading && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {decks.items && decks.items.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("decks.standaloneEmpty")}
        </p>
      )}

      <ul className="space-y-3">
        {decks.items?.map((d) => (
          <OfficialDeckRow
            key={d.id}
            deck={d}
            busy={subscribingId === d.id}
            onAdd={onAdd}
          />
        ))}
      </ul>
      {decks.hasMore && decks.items && (
        <button
          onClick={() => void decks.loadMore()}
          disabled={decks.loadingMore}
          className="mt-3 text-sm text-indigo-600 disabled:opacity-50"
        >
          {decks.loadingMore ? t("decks.loadingMore") : t("decks.loadMore")}
        </button>
      )}
    </div>
  );
}
