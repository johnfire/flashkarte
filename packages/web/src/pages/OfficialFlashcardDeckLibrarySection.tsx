import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import type { DeckCollection, OfficialDeck } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CollectionRow } from "./CollectionRow";
import { OfficialDeckRow } from "./OfficialDeckRow";

const LIBRARY_PAGE_SIZE = 100;

/** Official flashcard deck collections and standalone decks in the Library. */
export function OfficialFlashcardDeckLibrarySection() {
  const { t } = useTranslation();
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const loadCollections = useCallback(
    () => api.decks.listCollections({ limit: LIBRARY_PAGE_SIZE }),
    [],
  );
  const loadDecks = useCallback(
    () => api.decks.listOfficial({ limit: LIBRARY_PAGE_SIZE }),
    [],
  );
  const collections = useAsync<DeckCollection[], []>(loadCollections, []);
  const decks = useAsync<OfficialDeck[], []>(loadDecks, []);

  async function addDeck(deckId: string) {
    setSubscribingId(deckId);
    try {
      await api.decks.subscribe(deckId);
      decks.setData(
        (officialDecks) =>
          officialDecks?.map((deck) =>
            deck.id === deckId ? { ...deck, subscribed: true } : deck,
          ) ?? officialDecks,
      );
    } catch (subscriptionError) {
      reportClientError({
        message:
          subscriptionError instanceof Error
            ? subscriptionError.message
            : String(subscriptionError),
        context: "OfficialFlashcardDeckLibrarySection.addDeck",
      });
      window.alert(t("decks.subscribeError"));
    } finally {
      setSubscribingId(null);
    }
  }

  const collectionError =
    collections.error instanceof ApiError
      ? collections.error.message
      : collections.error
        ? t("decks.loadError")
        : null;
  const deckError =
    decks.error instanceof ApiError
      ? decks.error.message
      : decks.error
        ? t("decks.loadError")
        : null;
  const isEmpty =
    !collections.loading &&
    !decks.loading &&
    !collectionError &&
    !deckError &&
    (collections.data?.length ?? 0) === 0 &&
    (decks.data?.length ?? 0) === 0;

  return (
    <section aria-labelledby="official-flashcard-decks-heading">
      <header className="mb-3">
        <h2
          id="official-flashcard-decks-heading"
          className="text-xl font-semibold"
        >
          <Link to="/library/official/decks" className="hover:underline">
            {t("libraryHub.officialDecksTitle")}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t("libraryHub.officialDecksDetail")}
        </p>
      </header>
      {collections.loading && decks.loading && <p>{t("common.loading")}</p>}
      {collectionError && (
        <p role="alert" className="text-red-600">
          {collectionError}
        </p>
      )}
      {deckError && (
        <p role="alert" className="text-red-600">
          {deckError}
        </p>
      )}
      {isEmpty && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("libraryHub.emptyOfficialDecks")}
        </p>
      )}
      {(collections.data?.length ?? 0) > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("libraryHub.deckCollections")}
          </h3>
          <ul className="space-y-3">
            {collections.data?.map((collection) => (
              <CollectionRow key={collection.id} collection={collection} />
            ))}
          </ul>
        </div>
      )}
      {(decks.data?.length ?? 0) > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("libraryHub.flashcardDecks")}
          </h3>
          <ul className="space-y-3">
            {decks.data?.map((deck) => (
              <OfficialDeckRow
                key={deck.id}
                deck={deck}
                busy={subscribingId === deck.id}
                onAdd={addDeck}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
