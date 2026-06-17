import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { extractDeckId } from "@flashkarte/shared";
import { api, ApiError } from "../api/client";
import { PublicDeckPreview } from "../api/types";
import { useDocumentHead } from "../seo/useDocumentHead";

export function PublicDeckPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const id = slug ? extractDeckId(slug) : null;
  const [deck, setDeck] = useState<PublicDeckPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError(t("publicDeck.notFound"));
      return;
    }
    api.publicLibrary
      .preview(id)
      .then(setDeck)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : t("publicDeck.notFound"),
        ),
      );
  }, [id, t]);

  useDocumentHead({
    title: deck
      ? `${deck.title} — flashcards by ${deck.author} | flashkarte`
      : "flashkarte",
    description: deck
      ? `${deck.cardCount} flashcards by ${deck.author} on flashkarte.`
      : undefined,
  });

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <Link to="/explore" className="text-sm text-indigo-600">
          {t("publicDeck.explore")}
        </Link>
      </div>
    );
  }
  if (!deck) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  const next = encodeURIComponent(`/d/${slug}`);
  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <Link to="/explore" className="text-sm text-indigo-600">
          {t("publicDeck.explore")}
        </Link>
      </header>
      <h1 className="text-3xl font-bold">{deck.title}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("decks.cardCount", { count: deck.cardCount })} ·{" "}
        {t("explore.by", { author: deck.author })}
      </p>
      <ul className="mt-6 space-y-2">
        {deck.cards.map((c, i) => (
          <li key={i} className="rounded-lg border p-3">
            {c.front}
          </li>
        ))}
      </ul>
      <div className="mt-8 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
        <p className="mb-3 text-sm">{t("publicDeck.cta")}</p>
        <Link
          to={`/login?mode=signup&next=${next}`}
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {t("publicDeck.ctaButton")}
        </Link>
      </div>
    </div>
  );
}
