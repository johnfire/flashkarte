import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { DeckWithCounts } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../hooks/use-async";
import { DeckListItem } from "./DeckListItem";
import { DeckListEmptyHint, DeckListLegendHint } from "./DeckListHints";

export function DeckListPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loadDecks = useCallback(async () => {
    try {
      return await api.decks.list();
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "DeckListPage.load",
      });
      throw err;
    }
  }, []);
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

      {decks && decks.length === 0 && !error && <DeckListEmptyHint />}
      {decks && decks.length > 0 && !error && <DeckListLegendHint />}

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
