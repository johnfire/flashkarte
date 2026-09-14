import { useTranslation } from "react-i18next";
import { LibraryDeck } from "../api/types";

interface LibraryDeckRowProps {
  deck: LibraryDeck;
  busy: boolean;
  onClone: (id: string) => void;
}

/** One public-library deck row with a Clone action — shared by the category tree and flat search results. */
export function LibraryDeckRow({ deck, busy, onClone }: LibraryDeckRowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{deck.title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("library.cardsByAuthor", {
            count: deck.cardCount,
            author: deck.author,
          })}
        </p>
      </div>
      <button
        onClick={() => onClone(deck.id)}
        disabled={busy}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? t("library.cloning") : t("library.clone")}
      </button>
    </li>
  );
}
