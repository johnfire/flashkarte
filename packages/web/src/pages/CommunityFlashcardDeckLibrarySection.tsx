import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import type { LibraryDeck, PublicCourseSummary } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { LibraryDeckRow } from "./LibraryDeckRow";
import { PublicDeckCollectionRow } from "./PublicDeckCollectionRow";

const LIBRARY_PAGE_SIZE = 100;

/** Community flashcard deck collections and standalone decks in the Library. */
export function CommunityFlashcardDeckLibrarySection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const loadCollections = useCallback(
    () => api.publicCourses.list({ limit: LIBRARY_PAGE_SIZE }),
    [],
  );
  const loadDecks = useCallback(
    () => api.library.list({ limit: LIBRARY_PAGE_SIZE }),
    [],
  );
  const collections = useAsync<PublicCourseSummary[], []>(loadCollections, []);
  const decks = useAsync<LibraryDeck[], []>(loadDecks, []);

  async function cloneCollection(collectionId: string) {
    setCloningId(`collection:${collectionId}`);
    setCloneError(null);
    try {
      const clonedCollection = await api.publicCourses.clone(collectionId);
      navigate(`/courses/${clonedCollection.course.id}`);
    } catch (collectionCloneError) {
      reportClientError({
        message:
          collectionCloneError instanceof Error
            ? collectionCloneError.message
            : String(collectionCloneError),
        context: "CommunityFlashcardDeckLibrarySection.cloneCollection",
      });
      setCloneError(
        collectionCloneError instanceof ApiError
          ? collectionCloneError.message
          : t("courses.cloneError"),
      );
    } finally {
      setCloningId(null);
    }
  }

  async function cloneDeck(deckId: string) {
    setCloningId(`deck:${deckId}`);
    setCloneError(null);
    try {
      const clonedDeck = await api.library.clone(deckId);
      navigate(`/decks/${clonedDeck.id}/study`);
    } catch (deckCloneError) {
      reportClientError({
        message:
          deckCloneError instanceof Error
            ? deckCloneError.message
            : String(deckCloneError),
        context: "CommunityFlashcardDeckLibrarySection.cloneDeck",
      });
      setCloneError(
        deckCloneError instanceof ApiError
          ? deckCloneError.message
          : t("library.cloneError"),
      );
    } finally {
      setCloningId(null);
    }
  }

  const collectionError =
    collections.error instanceof ApiError
      ? collections.error.message
      : collections.error
        ? t("courses.loadError")
        : null;
  const deckError =
    decks.error instanceof ApiError
      ? decks.error.message
      : decks.error
        ? t("library.loadError")
        : null;
  const isEmpty =
    !collections.loading &&
    !decks.loading &&
    !collectionError &&
    !deckError &&
    (collections.data?.length ?? 0) === 0 &&
    (decks.data?.length ?? 0) === 0;

  return (
    <section aria-labelledby="community-flashcard-decks-heading">
      <header className="mb-3">
        <h2
          id="community-flashcard-decks-heading"
          className="text-xl font-semibold"
        >
          <Link to="/library/community/decks" className="hover:underline">
            {t("libraryHub.communityDecksTitle")}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t("libraryHub.communityDecksDetail")}
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
      {cloneError && (
        <p role="alert" className="text-red-600">
          {cloneError}
        </p>
      )}
      {isEmpty && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("libraryHub.emptyCommunityDecks")}
        </p>
      )}
      {(collections.data?.length ?? 0) > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("libraryHub.deckCollections")}
          </h3>
          <ul className="content-card-grid">
            {collections.data?.map((collection) => (
              <PublicDeckCollectionRow
                key={collection.id}
                collection={collection}
                busy={cloningId === `collection:${collection.id}`}
                onClone={cloneCollection}
              />
            ))}
          </ul>
        </div>
      )}
      {(decks.data?.length ?? 0) > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("libraryHub.flashcardDecks")}
          </h3>
          <ul className="content-card-grid">
            {decks.data?.map((deck) => (
              <LibraryDeckRow
                key={deck.id}
                deck={deck}
                busy={cloningId === `deck:${deck.id}`}
                onClone={cloneDeck}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
