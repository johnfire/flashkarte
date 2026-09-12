import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError, BrowseParams } from "../api/client";
import { DeckCollection, OfficialDeck } from "../api/types";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { OfficialDeckRow } from "./OfficialDeckRow";
import { CollectionRow } from "./CollectionRow";

export function AppDecksPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const loadCollections = useCallback(
    (params: BrowseParams) => api.decks.listCollections(params),
    [],
  );
  const collections = usePaginatedList<DeckCollection>(loadCollections);

  const loadStandalone = useCallback(
    (params: BrowseParams) => api.decks.listOfficial(params),
    [],
  );
  const standalone = usePaginatedList<OfficialDeck>(loadStandalone);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void collections.search(q);
    void standalone.search(q);
  }

  async function onAdd(id: string) {
    setSubscribingId(id);
    try {
      await api.decks.subscribe(id);
      standalone.setItems(
        (list) =>
          list?.map((d) => (d.id === id ? { ...d, subscribed: true } : d)) ??
          list,
      );
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "AppDecksPage.onAdd",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setSubscribingId(null);
    }
  }

  const error = [collections.error, standalone.error].find(Boolean);
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("decks.loadError")
        : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("decks.appDecksTitle")}</h1>
        <Link
          to="/"
          className="self-center text-sm text-gray-500 dark:text-gray-400"
        >
          {t("library.myDecks")}
        </Link>
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

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
          {t("decks.collectionsSectionTitle")}
        </h2>
        {collections.loading && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("common.loading")}
          </p>
        )}
        {collections.items && collections.items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("decks.collectionsEmpty")}
          </p>
        )}
        <ul className="space-y-3">
          {collections.items?.map((c) => (
            <CollectionRow key={c.id} collection={c} />
          ))}
        </ul>
        {collections.hasMore && collections.items && (
          <button
            onClick={() => void collections.loadMore()}
            disabled={collections.loadingMore}
            className="mt-3 text-sm text-indigo-600 disabled:opacity-50"
          >
            {collections.loadingMore
              ? t("decks.loadingMore")
              : t("decks.loadMore")}
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
          {t("decks.standaloneSectionTitle")}
        </h2>
        {standalone.loading && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("common.loading")}
          </p>
        )}
        {standalone.items && standalone.items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("decks.standaloneEmpty")}
          </p>
        )}
        <ul className="space-y-3">
          {standalone.items?.map((d) => (
            <OfficialDeckRow
              key={d.id}
              deck={d}
              busy={subscribingId === d.id}
              onAdd={onAdd}
            />
          ))}
        </ul>
        {standalone.hasMore && standalone.items && (
          <button
            onClick={() => void standalone.loadMore()}
            disabled={standalone.loadingMore}
            className="mt-3 text-sm text-indigo-600 disabled:opacity-50"
          >
            {standalone.loadingMore
              ? t("decks.loadingMore")
              : t("decks.loadMore")}
          </button>
        )}
      </section>
    </div>
  );
}
