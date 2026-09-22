import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError, BrowseParams } from "../api/client";
import { DeckCollection, OfficialDeck } from "../api/types";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { OfficialDeckRow } from "./OfficialDeckRow";
import { CollectionRow } from "./CollectionRow";

interface CategoryContentsProps {
  categoryId: string;
}

/**
 * The collections + standalone official decks placed directly on one
 * category or subcategory — the expanded body of a CategorySection. Mounted
 * only while that section is expanded, so nothing fetches until the user
 * opens it.
 */
export function CategoryContents({ categoryId }: CategoryContentsProps) {
  const { t } = useTranslation();
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const loadCollections = useCallback(
    (params: BrowseParams) =>
      api.decks.listCollections({ ...params, categoryId }),
    [categoryId],
  );
  const collections = usePaginatedList<DeckCollection>(loadCollections);

  const loadStandalone = useCallback(
    (params: BrowseParams) => api.decks.listOfficial({ ...params, categoryId }),
    [categoryId],
  );
  const standalone = usePaginatedList<OfficialDeck>(loadStandalone);

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
        context: "CategoryContents.onAdd",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setSubscribingId(null);
    }
  }

  const loading = collections.loading || standalone.loading;
  const error = [collections.error, standalone.error].find(Boolean);
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("decks.loadError")
        : null;
  const isEmpty =
    !loading &&
    !errorMessage &&
    (collections.items?.length ?? 0) === 0 &&
    (standalone.items?.length ?? 0) === 0;

  return (
    <div className="space-y-4 border-l pl-4">
      {loading && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      {isEmpty && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("decks.standaloneEmpty")}
        </p>
      )}

      {(collections.items?.length ?? 0) > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("decks.collectionsSectionTitle")}
          </h4>
          <ul className="content-card-grid">
            {collections.items?.map((c) => (
              <CollectionRow key={c.id} collection={c} />
            ))}
          </ul>
          {collections.hasMore && (
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
        </div>
      )}

      {(standalone.items?.length ?? 0) > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("decks.standaloneSectionTitle")}
          </h4>
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
          {standalone.hasMore && (
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
        </div>
      )}
    </div>
  );
}
