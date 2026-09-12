import { useTranslation } from "react-i18next";
import { OfficialDeck } from "../api/types";

interface OfficialDecksSectionProps {
  decks: OfficialDeck[];
  loadError: unknown;
  subscribingId: string | null;
  onSubscribe: (id: string) => void;
}

/** Official (app-owned) decks the caller hasn't added to their own list yet. */
export function OfficialDecksSection({
  decks,
  loadError,
  subscribingId,
  onSubscribe,
}: OfficialDecksSectionProps) {
  const { t } = useTranslation();
  if (decks.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
        {t("decks.officialSectionTitle")}
      </h2>
      {Boolean(loadError) && (
        <p className="mb-3 text-sm text-red-600">
          {t("decks.officialLoadError")}
        </p>
      )}
      <ul className="space-y-3">
        {decks.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between rounded-lg border border-dashed p-4"
          >
            <div>
              <p className="font-medium">{d.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("decks.cardCount", { count: d.card_count })}
              </p>
            </div>
            <button
              onClick={() => onSubscribe(d.id)}
              disabled={subscribingId === d.id}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {subscribingId === d.id ? t("decks.adding") : t("decks.add")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
