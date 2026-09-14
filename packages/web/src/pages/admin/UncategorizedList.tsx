import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, BrowseParams } from "../../api/client";
import { usePaginatedList } from "../../hooks/use-paginated-list";

interface UncategorizedItem {
  id: string;
  title: string;
}

interface UncategorizedListProps<T extends UncategorizedItem> {
  heading: string;
  targetCategoryId: string | null;
  loadItems: (params: BrowseParams) => Promise<T[]>;
  detailText: (item: T) => string;
  onAssign: (itemId: string, categoryId: string) => Promise<void>;
  // Reported after every load so the parent can show one combined
  // "all caught up" message once every section is empty, instead of
  // repeating that message three times.
  onCountChange: (count: number) => void;
}

/**
 * One uncategorized-items list for the quick-categorize triage panel.
 * Clicking a row assigns it straight to `targetCategoryId` and removes it
 * from the list — generic over collections/official decks/library decks so
 * CategorizeTriagePanel doesn't repeat this three times.
 */
export function UncategorizedList<T extends UncategorizedItem>({
  heading,
  targetCategoryId,
  loadItems,
  detailText,
  onAssign,
  onCountChange,
}: UncategorizedListProps<T>) {
  const { t } = useTranslation();
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const loadUncategorized = useCallback(
    (params: BrowseParams) =>
      loadItems({ ...params, categoryId: "uncategorized" }),
    [loadItems],
  );
  const items = usePaginatedList<T>(loadUncategorized);

  useEffect(() => {
    if (!items.loading && items.items) onCountChange(items.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.loading, items.items]);

  async function onClickItem(item: T) {
    if (!targetCategoryId || assigningId) return;
    setAssigningId(item.id);
    setRowError(null);
    try {
      await onAssign(item.id, targetCategoryId);
      items.setItems((list) => list?.filter((i) => i.id !== item.id) ?? list);
    } catch (err) {
      setRowError(
        err instanceof ApiError
          ? err.message
          : t("admin.categories.assignError"),
      );
    } finally {
      setAssigningId(null);
    }
  }

  if (items.loading || (items.items && items.items.length === 0)) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        {heading}
      </h4>
      {rowError && <p className="mb-2 text-xs text-red-600">{rowError}</p>}
      <ul className="space-y-2">
        {items.items?.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => void onClickItem(item)}
              disabled={!targetCategoryId || assigningId === item.id}
              className="flex w-full items-center justify-between gap-3 rounded-lg border p-2 text-left disabled:opacity-50"
            >
              <span className="min-w-0 truncate text-sm">{item.title}</span>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {detailText(item)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.hasMore && (
        <button
          onClick={() => void items.loadMore()}
          disabled={items.loadingMore}
          className="mt-2 text-sm text-indigo-600 disabled:opacity-50"
        >
          {items.loadingMore ? t("decks.loadingMore") : t("decks.loadMore")}
        </button>
      )}
    </div>
  );
}
