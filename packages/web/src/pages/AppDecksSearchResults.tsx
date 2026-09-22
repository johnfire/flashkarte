import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError, BrowseParams } from "../api/client";
import { DeckCollection, OfficialDeck } from "../api/types";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { OfficialDeckRow } from "./OfficialDeckRow";
import { CollectionRow } from "./CollectionRow";

interface AppDecksSearchResultsProps {
  q: string;
}

/**
 * Flat, cross-category search results for the App Decks page — deliberately
 * ignores category grouping so a search reaches every collection/deck
 * regardless of where it's filed. Mounted only while a search is active;
 * `q` is the query at mount time, and later changes re-search in place.
 */
export function AppDecksSearchResults({ q }: AppDecksSearchResultsProps) {
  const { t } = useTranslation();
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const loadCollections = useCallback(
    (params: BrowseParams) => api.decks.listCollections(params),
    [],
  );
  const collections = usePaginatedList<DeckCollection>(loadCollections, 30, q);

  const loadStandalone = useCallback(
    (params: BrowseParams) => api.decks.listOfficial(params),
    [],
  );
  const standalone = usePaginatedList<OfficialDeck>(loadStandalone, 30, q);

  // Mount already searched with the initial `q`; only re-search when it
  // changes afterwards (the user edits the query without clearing it).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void collections.search(q);
    void standalone.search(q);
    // collections/standalone are stable across renders (useState setters);
    // only `q` should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

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
        context: "AppDecksSearchResults.onAdd",
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
    <>
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
        <ul className="content-card-grid">
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
        <ul className="content-card-grid">
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
    </>
  );
}
