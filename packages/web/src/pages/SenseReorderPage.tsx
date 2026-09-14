import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { Card } from "../api/types";
import { useAsync } from "../hooks/use-async";

function moved<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SenseReorderPage() {
  const { t } = useTranslation();
  const { id: deckId, word } = useParams<{ id: string; word: string }>();
  const loadDeck = useCallback(async () => {
    if (!deckId) return null;
    return api.decks.get(deckId);
  }, [deckId]);
  const { data: deck, error: loadError, loading } = useAsync(loadDeck, []);

  const [order, setOrder] = useState<Card[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!deck || !word) return;
    const siblings = deck.cards
      .filter((c) => c.content.sense?.word === word)
      .sort(
        (a, b) => (a.content.sense?.index ?? 0) - (b.content.sense?.index ?? 0),
      );
    setOrder(siblings);
  }, [deck, word]);

  async function onSave() {
    if (!deckId || !word) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.decks.reorderSenses(
        deckId,
        word,
        order.map((c) => c.id),
      );
      setSaved(true);
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "SenseReorderPage.onSave",
      });
      setSaveError(
        err instanceof ApiError ? err.message : t("reorderSenses.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("reorderSenses.loadError")
        : null;

  return (
    <div className="mx-auto max-w-xl p-4">
      <Link
        to={`/decks/${deckId}/cards`}
        className="mb-4 inline-block text-sm text-indigo-600"
      >
        {t("reorderSenses.back")}
      </Link>

      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {deck && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">
            {t("reorderSenses.title", { word })}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("reorderSenses.hint")}
          </p>

          <ul className="space-y-2">
            {order.map((card, i) => (
              <li
                key={card.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="min-w-0 flex-1 truncate">
                  {i + 1}. {card.content.sense?.context || card.content.back}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => setOrder(moved(order, i, i - 1))}
                    className="rounded border px-2 py-1 text-sm disabled:opacity-30"
                    aria-label={t("reorderSenses.moveUp")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === order.length - 1}
                    onClick={() => setOrder(moved(order, i, i + 1))}
                    className="rounded border px-2 py-1 text-sm disabled:opacity-30"
                    aria-label={t("reorderSenses.moveDown")}
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {saveError && <p className="text-red-600">{saveError}</p>}
          {saved && (
            <p className="text-green-600">{t("reorderSenses.saved")}</p>
          )}

          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {t("reorderSenses.save")}
          </button>
        </div>
      )}
    </div>
  );
}
