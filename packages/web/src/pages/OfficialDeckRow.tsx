import { useTranslation } from "react-i18next";
import { OfficialDeck } from "../api/types";

interface OfficialDeckRowProps {
  deck: OfficialDeck;
  busy: boolean;
  onAdd: (id: string) => void;
}

/** One deck row with an Add/Added button — shared by both App Decks browse pages. */
export function OfficialDeckRow({ deck, busy, onAdd }: OfficialDeckRowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between rounded-lg border border-dashed p-4">
      <div>
        <p className="font-medium">
          {deck.title}
          {deck.reference_number !== undefined && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              #{deck.reference_number}
            </span>
          )}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("decks.cardCount", { count: deck.card_count })}
        </p>
      </div>
      <button
        onClick={() => onAdd(deck.id)}
        disabled={busy || deck.subscribed}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {deck.subscribed
          ? t("decks.added")
          : busy
            ? t("decks.adding")
            : t("decks.add")}
      </button>
    </li>
  );
}
