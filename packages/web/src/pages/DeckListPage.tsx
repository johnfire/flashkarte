import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, reportClientError } from "../api/client";
import { DeckWithCounts } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export function DeckListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<DeckWithCounts[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDecks(await api.decks.list());
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "DeckListPage.load",
      });
      setError(
        err instanceof ApiError ? err.message : "Couldn't load your decks",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.decks.remove(id);
      setDecks((d) => (d ? d.filter((x) => x.id !== id) : d));
    } catch (err) {
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        context: "DeckListPage.onDelete",
      });
      window.alert("Couldn't delete the deck. Try again.");
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
      window.alert("Couldn't update sharing. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Decks</h1>
        <div className="flex gap-3">
          <Link
            to="/decks/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
          >
            New deck
          </Link>
          <Link
            to="/library"
            className="self-center text-sm text-gray-500 dark:text-gray-400"
          >
            Library
          </Link>
          {user?.accountType === "admin" && (
            <Link
              to="/admin"
              className="self-center text-sm text-gray-500 dark:text-gray-400"
            >
              Admin
            </Link>
          )}
          <Link
            to="/settings"
            className="self-center text-sm text-gray-500 dark:text-gray-400"
          >
            Settings
          </Link>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Sign out
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {decks === null && !error && (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      )}

      {decks && decks.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          No decks yet. Create one to start studying.
        </p>
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
                    Public
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {d.card_count} cards · {d.due_count} due
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/decks/${d.id}/study`}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Study
              </Link>
              <button
                onClick={() => onTogglePublic(d.id, !d.is_public)}
                className="text-sm text-indigo-600"
                title={
                  d.is_public
                    ? "Remove from the public library"
                    : "Share to the public library"
                }
              >
                {d.is_public ? "Unshare" : "Share"}
              </button>
              <button
                onClick={() => onDelete(d.id, d.title)}
                className="text-sm text-red-600"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
