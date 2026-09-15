import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { DeckDetail } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CardText } from "../components/CardText";

/** A card's own display text, whichever field its type stores it under. */
function cardFrontText(
  content: DeckDetail["cards"][number]["content"],
): string {
  return content.front ?? content.prompt ?? "";
}

function cardTypeBadge(card: DeckDetail["cards"][number]): string | null {
  if (card.type === "branch") return "branch";
  if (card.content.sense) return "sense";
  if (card.content.options && card.content.options.length > 0) {
    return "diagnostic";
  }
  return null;
}

export function ManageDeckCardsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const loadDeck = useCallback(async () => {
    if (!id) return null;
    return api.decks.get(id);
  }, [id]);
  const { data: deck, error: loadError, loading } = useAsync(loadDeck, []);
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("manageCards.loadError")
        : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-indigo-600">
          {t("manageCards.back")}
        </Link>
      </div>

      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {deck && (
        <>
          <h1 className="mb-1 text-2xl font-bold">
            {t("manageCards.title", { deck: deck.title })}
          </h1>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {t("manageCards.cardCount", { count: deck.cards.length })}
          </p>

          {deck.cards.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">
              {t("manageCards.empty")}
            </p>
          )}

          <ul className="space-y-2">
            {deck.cards.map((card) => {
              const badge = cardTypeBadge(card);
              return (
                <li key={card.id}>
                  <Link
                    to={`/decks/${id}/cards/${card.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className="w-8 shrink-0 tabular-nums text-sm text-gray-400 dark:text-gray-500">
                      {card.position + 1}.
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <CardText text={cardFrontText(card.content)} />
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      {card.category && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {card.category}
                        </span>
                      )}
                      {badge && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                          {t(`manageCards.type.${badge}`)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
