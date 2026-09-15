import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CourseDeckView } from "../api/types";

interface CourseDeckRowProps {
  deck: CourseDeckView;
  onRemove: (deckId: string, title: string) => void;
}

export function CourseDeckRow({ deck: d, onRemove }: CourseDeckRowProps) {
  const { t } = useTranslation();
  return (
    <li
      className={`flex items-center justify-between rounded-lg border p-4 ${
        d.locked ? "opacity-60" : ""
      }`}
    >
      <div>
        <p className="font-medium">
          {d.position + 1}. {d.title}
          {d.locked && (
            <span
              className="ml-2 text-xs text-gray-500 dark:text-gray-400"
              title={t("courses.lockedTitle")}
            >
              🔒
            </span>
          )}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("courses.deckProgress", {
            mastered: d.mastered_count,
            total: d.card_count,
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {d.locked ? (
          <span
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            title={t("courses.lockedHint")}
          >
            {t("courses.locked")}
          </span>
        ) : (
          <Link
            to={`/decks/${d.deck_id}/study`}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            {t("decks.study")}
          </Link>
        )}
        <button
          onClick={() => onRemove(d.deck_id, d.title)}
          className="text-sm text-red-600"
        >
          {t("courses.removeDeck")}
        </button>
      </div>
    </li>
  );
}
