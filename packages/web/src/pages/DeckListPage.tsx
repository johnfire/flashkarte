import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError, reportClientError } from "../api/client";
import { DeckWithCounts } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../hooks/use-async";

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

      {decks && decks.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400">{t("decks.empty")}</p>
      )}

      <ul className="space-y-3">
        {decks?.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">
                {d.title}
                {d.is_public && (
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    {t("decks.public")}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("decks.cardCount", { count: d.card_count })} ·{" "}
                {t("decks.dueCount", { count: d.due_count })}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {t("decks.viewed", { count: d.viewed_count })}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {t("decks.new", { count: d.new_count })}
                </span>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  {t("decks.again", { count: d.again_count })}
                </span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {t("decks.hard", { count: d.hard_count })}
                </span>
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  {t("decks.good", { count: d.good_count })}
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {t("decks.easy", { count: d.easy_count })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/decks/${d.id}/study`}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                {t("decks.study")}
              </Link>
              <button
                onClick={() => onTogglePublic(d.id, !d.is_public)}
                className="text-sm text-indigo-600"
                title={
                  d.is_public ? t("decks.unshareTitle") : t("decks.shareTitle")
                }
              >
                {d.is_public ? t("decks.unshare") : t("decks.share")}
              </button>
              <button
                onClick={() => onDelete(d.id, d.title)}
                className="text-sm text-red-600"
              >
                {t("decks.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
