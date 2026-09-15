import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { CardEditPatch } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CardText } from "../components/CardText";
import { OptionsFieldList } from "./OptionsFieldList";

export function EditCardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: deckId, cardId } = useParams<{ id: string; cardId: string }>();
  const loadDeck = useCallback(async () => {
    if (!deckId) return null;
    return api.decks.get(deckId);
  }, [deckId]);
  const { data: deck, error: loadError, loading } = useAsync(loadDeck, []);

  const card = deck?.cards.find((c) => c.id === cardId);
  const isBranch = card?.type === "branch";
  const hasOptions = isBranch || (card?.content.options?.length ?? 0) > 0;
  const isSense = Boolean(card?.content.sense);

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState<CardEditPatch["options"]>([]);
  const [senseContext, setSenseContext] = useState("");
  const [senseHint, setSenseHint] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (card && !initialized) {
    setFront(card.content.front ?? card.content.prompt ?? "");
    setBack(card.content.back ?? "");
    setCategory(card.category ?? "");
    setOptions(card.content.options ?? []);
    setSenseContext(card.content.sense?.context ?? "");
    setSenseHint(card.content.sense?.hint ?? "");
    setInitialized(true);
  }

  async function onSave() {
    if (!deckId || !cardId) return;
    setSaving(true);
    setSaveError(null);
    const patch: CardEditPatch = { front };
    if (!isBranch) {
      patch.back = back;
      patch.category = category.trim() === "" ? null : category.trim();
    }
    if (hasOptions) patch.options = options;
    if (isSense) patch.sense = { context: senseContext, hint: senseHint };
    try {
      await api.decks.updateCard(deckId, cardId, patch);
      navigate(`/decks/${deckId}/cards`);
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "EditCardPage.onSave",
      });
      setSaveError(
        err instanceof ApiError ? err.message : t("editCard.saveError"),
      );
    } finally {
      setSaving(false);
    }
  }

  const availableTargets = [
    ...(deck?.cards
      .map((c) => c.content.label)
      .filter((l): l is string => Boolean(l)) ?? []),
    "end",
  ];

  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("editCard.loadError")
        : null;

  return (
    <div className="mx-auto max-w-xl p-4">
      <Link
        to={`/decks/${deckId}/cards`}
        className="mb-4 inline-block text-sm text-indigo-600"
      >
        {t("editCard.back")}
      </Link>

      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {deck && !card && (
        <p className="text-red-600">{t("editCard.loadError")}</p>
      )}

      {card && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">
            {t("editCard.title", { number: card.position + 1 })}
          </h1>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {isBranch ? t("editCard.prompt") : t("editCard.front")}
            </label>
            <textarea
              className="w-full rounded border px-2 py-1 dark:bg-gray-800"
              rows={2}
              value={front}
              onChange={(e) => setFront(e.target.value)}
            />
          </div>

          {!isBranch && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("editCard.backLabel")}
              </label>
              <textarea
                className="w-full rounded border px-2 py-1 dark:bg-gray-800"
                rows={4}
                value={back}
                onChange={(e) => setBack(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("editCard.preview")}
              </p>
              <div className="rounded border border-dashed p-2 text-sm">
                <CardText text={back} />
              </div>
            </div>
          )}

          {!isBranch && !isSense && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("editCard.category")}
              </label>
              <input
                className="w-full rounded border px-2 py-1 dark:bg-gray-800"
                value={category}
                placeholder={t("editCard.categoryPlaceholder")}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          )}

          {hasOptions && (
            <OptionsFieldList
              options={options ?? []}
              onChange={setOptions}
              availableTargets={availableTargets}
            />
          )}

          {isSense && card.content.sense && (
            <div className="space-y-2 rounded border p-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("editCard.senseChainInfo", {
                  index: card.content.sense.index + 1,
                  count: card.content.sense.count,
                })}
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("editCard.senseContext")}
                </label>
                <input
                  className="w-full rounded border px-2 py-1 dark:bg-gray-800"
                  value={senseContext}
                  onChange={(e) => setSenseContext(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("editCard.senseHint")}
                </label>
                <input
                  className="w-full rounded border px-2 py-1 dark:bg-gray-800"
                  value={senseHint}
                  onChange={(e) => setSenseHint(e.target.value)}
                />
              </div>
              {card.content.sense.count > 1 && (
                <Link
                  to={`/decks/${deckId}/senses/${encodeURIComponent(card.content.sense.word)}/reorder`}
                  className="inline-block text-sm text-indigo-600"
                >
                  {t("editCard.reorderSenses")}
                </Link>
              )}
            </div>
          )}

          {saveError && <p className="text-red-600">{saveError}</p>}

          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {t("editCard.save")}
          </button>
        </div>
      )}
    </div>
  );
}
