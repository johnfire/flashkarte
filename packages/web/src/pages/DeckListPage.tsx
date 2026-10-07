import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  ApiError,
  isVerificationRequired,
  reportClientError,
} from "../api/client";
import { DeckWithCounts } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { PersonalContentMenu } from "../components/PersonalContentMenu";
import { PersonalContentTabs } from "../components/PersonalContentTabs";
import { useAsync } from "../hooks/use-async";
import { DeckListItem } from "./DeckListItem";
import { SharedWithMeSection } from "./SharedWithMeSection";
import { ContentLanguageSwitcher } from "../components/ContentLanguageSwitcher";
import { useContentLanguage } from "../hooks/use-content-language";
import {
  DeckListEmptyHint,
  DeckListLegendHint,
  DeckListLanguageEmpty,
  DeckListVerifyPanel,
} from "./DeckListHints";

export function DeckListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, choose } = useContentLanguage("decks");
  // Product APIs are gated behind a verified email, and verification can only
  // be outstanding on a brand-new account (changing an email keeps the old
  // address verified until the new one is confirmed) — so an unverified user
  // provably owns no decks. Skip the request that would only ever 403.
  const verified = Boolean(user?.emailVerifiedAt);
  const loadDecks = useCallback(async () => {
    if (!verified) return [];
    try {
      return await api.decks.list();
    } catch (err) {
      // Defence in depth: if the cached user is stale the request still goes
      // out, and a deliberate refusal must not be filed as a client error.
      if (isVerificationRequired(err)) return [];
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "DeckListPage.load",
      });
      throw err;
    }
  }, [verified]);
  const {
    data: decks,
    error: loadError,
    loading,
    setData: setDecks,
    reload: reloadDecks,
  } = useAsync<DeckWithCounts[], []>(loadDecks, []);
  // School, teacher and student accounts share with (and receive from)
  // their school and classes.
  const canShareWithGroups =
    user?.accountKind === "teacher" ||
    user?.accountKind === "student" ||
    user?.accountKind === "school";
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("decks.loadError")
        : null;

  async function onDelete(id: string, title: string) {
    if (!window.confirm(t("decks.deleteConfirm", { title }))) return;
    try {
      await api.decks.remove(id);
      setDecks((d) => (d ? d.filter((x) => x.id !== id) : d));
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "DeckListPage.onDelete",
      });
      window.alert(t("decks.deleteError"));
    }
  }

  async function onUnsubscribe(id: string, title: string) {
    if (!window.confirm(t("decks.removeConfirm", { title }))) return;
    try {
      await api.decks.unsubscribe(id);
      setDecks((d) => (d ? d.filter((x) => x.id !== id) : d));
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "DeckListPage.onUnsubscribe",
      });
      window.alert(t("decks.removeError"));
    }
  }

  async function onTogglePublic(id: string, makePublic: boolean) {
    // optimistic
    setDecks((d) =>
      d ? d.map((x) => (x.id === id ? { ...x, is_public: makePublic } : x)) : d,
    );
    try {
      await api.decks.setPublic(id, makePublic);
    } catch (failure) {
      setDecks((d) =>
        d
          ? d.map((x) => (x.id === id ? { ...x, is_public: !makePublic } : x))
          : d,
      );
      window.alert(
        failure instanceof ApiError
          ? failure.message
          : t("decks.togglePublicError"),
      );
    }
  }

  async function onLanguageChange(
    id: string,
    contentLanguage: "en" | "de" | "ar",
  ) {
    try {
      await api.decks.setContentLanguage(id, contentLanguage);
      setDecks(
        (current) =>
          current?.map((deck) =>
            deck.id === id
              ? { ...deck, content_language: contentLanguage }
              : deck,
          ) ?? null,
      );
    } catch (failure) {
      window.alert(
        failure instanceof ApiError
          ? failure.message
          : t("contentLanguage.saveError"),
      );
    }
  }

  const visibleDecks =
    decks?.filter(
      (deck) => language === "all" || deck.content_language === language,
    ) ?? [];
  const hiddenCount = (decks?.length ?? 0) - visibleDecks.length;

  return (
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <PersonalContentTabs />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("decks.title")}</h1>
        <PersonalContentMenu />
      </header>
      <ContentLanguageSwitcher value={language} onChange={choose} />

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {/* Only school, teacher and student accounts can receive shared decks. */}
      {verified && canShareWithGroups && (
        <SharedWithMeSection onAdded={() => void reloadDecks()} />
      )}

      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}

      {!verified && !error && user && (
        <DeckListVerifyPanel email={user.email} />
      )}
      {verified && decks && decks.length === 0 && !error && (
        <DeckListEmptyHint />
      )}
      {verified && decks && decks.length > 0 && !error && (
        <DeckListLegendHint />
      )}

      {verified && decks && decks.length > 0 && hiddenCount > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("contentLanguage.hiddenCount", { count: hiddenCount })}
        </p>
      )}
      {verified &&
        decks &&
        decks.length > 0 &&
        language !== "all" &&
        visibleDecks.length === 0 && (
          <DeckListLanguageEmpty
            language={language}
            showAll={() => choose("all")}
          />
        )}
      <ul className="content-card-grid">
        {visibleDecks.map((d) => (
          <DeckListItem
            key={d.id}
            deck={d}
            onTogglePublic={onTogglePublic}
            onLanguageChange={onLanguageChange}
            onDelete={onDelete}
            onUnsubscribe={onUnsubscribe}
            canShareWithGroups={canShareWithGroups}
          />
        ))}
      </ul>
    </div>
  );
}
