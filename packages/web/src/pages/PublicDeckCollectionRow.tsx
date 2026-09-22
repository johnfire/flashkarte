import { useTranslation } from "react-i18next";
import type { PublicCourseSummary } from "../api/types";

interface PublicDeckCollectionRowProps {
  collection: PublicCourseSummary;
  busy: boolean;
  onClone: (id: string) => void;
}

/** A community flashcard deck collection with a direct Clone action. */
export function PublicDeckCollectionRow({
  collection,
  busy,
  onClone,
}: PublicDeckCollectionRowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {collection.title}
          {collection.reference_number !== undefined && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              #{collection.reference_number}
            </span>
          )}
        </p>
        {collection.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {collection.description}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("decks.deckCount", { count: collection.decks_total })}
        </p>
      </div>
      <button
        onClick={() => onClone(collection.id)}
        disabled={busy}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? t("courses.cloning") : t("courses.clone")}
      </button>
    </li>
  );
}
