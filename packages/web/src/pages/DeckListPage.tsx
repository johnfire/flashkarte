import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  api,
  ApiError,
  isVerificationRequired,
  reportClientError,
} from "../api/client";
import { DeckWithCounts } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../hooks/use-async";
import { DeckListItem } from "./DeckListItem";
import {
  DeckListEmptyHint,
  DeckListLegendHint,
  DeckListVerifyPanel,
} from "./DeckListHints";

export function DeckListPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  } = useAsync<DeckWithCounts[], []>(loadDecks, []);
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

  async function onTogglePublic(id: string, makePublic: boolean) {
    // optimistic
    setDecks((d) =>
      d ? d.map((x) => (x.id === id ? { ...x, is_public: makePublic } : x)) : d,
    );
    try {
      await api.decks.setPublic(id, makePublic);
    } catch {
      setDecks((d) =>
        d
          ? d.map((x) => (x.id === id ? { ...x, is_public: !makePublic } : x))
          : d,
      );
      window.alert(t("decks.togglePublicError"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("decks.title")}</h1>
        <div className="flex gap-3">
          <Link
            to="/decks/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
          >
            {t("decks.newDeck")}
          </Link>
          <Link
            to="/library"
            className="self-center text-sm text-gray-500 dark:text-gray-400"
          >
            {t("decks.library")}
          </Link>
          <Link
            to="/help"
            className="self-center text-sm text-gray-500 dark:text-gray-400"
          >
            {t("common.help")}
          </Link>
          {user?.accountType === "admin" && (
            <Link
              to="/admin"
              className="self-center text-sm text-gray-500 dark:text-gray-400"
            >
              {t("decks.admin")}
            </Link>
          )}
          <Link
            to="/settings"
            className="self-center text-sm text-gray-500 dark:text-gray-400"
          >
            {t("decks.settings")}
          </Link>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {t("decks.signOut")}
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-red-600">{error}</p>}

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

      <ul className="space-y-3">
        {decks?.map((d) => (
          <DeckListItem
            key={d.id}
            deck={d}
            onTogglePublic={onTogglePublic}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
