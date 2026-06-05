import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ApiKey, CreatedApiKey, AccountType } from "../api/types";
import { useAuth } from "../auth/AuthContext";

const MCP_URL = `${typeof location !== "undefined" ? location.origin : ""}/mcp`;

const PLAN_LABEL: Record<AccountType, string> = {
  free: "Free",
  paid: "Paid",
  "admin-gifted": "Gifted",
  admin: "Admin",
};

export function SettingsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("My AI");
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setKeys(await api.keys.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load keys");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const key = await api.keys.create(newName.trim() || "My AI");
      setCreated(key);
      setKeys((k) => (k ? [{ ...key }, ...k] : [key]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create key");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(prefix: string) {
    if (!window.confirm("Revoke this key? Any AI using it will lose access."))
      return;
    try {
      await api.keys.revoke(prefix);
      setKeys((k) => (k ? k.filter((x) => x.key_prefix !== prefix) : k));
      if (created?.key_prefix === prefix) setCreated(null);
    } catch {
      window.alert("Couldn't revoke the key. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← Decks
        </Link>
      </header>

      {user && (
        <section className="mb-8 rounded-lg border p-4">
          <h2 className="mb-1 text-xl font-semibold">Account</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {user.email}
          </p>
          <p className="mt-2 text-sm">
            Plan:{" "}
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {PLAN_LABEL[user.accountType] ?? user.accountType}
            </span>
          </p>
        </section>
      )}

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-1 text-xl font-semibold">Connect your AI</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          Generate an API key and add it to your AI client (e.g. Claude Desktop)
          along with the flashkarte MCP server URL. Your AI can then build decks
          from any topic and push them straight into your account.
        </p>
        <p className="mb-4 text-sm">
          MCP server URL:{" "}
          <code className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
            {MCP_URL}
          </code>
        </p>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key name (e.g. My AI)"
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "…" : "Generate key"}
          </button>
        </div>

        {created && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="mb-1 text-sm font-medium text-amber-800">
              Copy this key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white dark:bg-gray-800 px-2 py-1 text-sm">
                {created.key}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(created.key)}
                className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Your keys</h2>
        {error && <p className="mb-3 text-red-600">{error}</p>}
        {keys === null && !error && (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        )}
        {keys && keys.length === 0 && !error && (
          <p className="text-gray-500 dark:text-gray-400">No keys yet.</p>
        )}
        <ul className="space-y-2">
          {keys?.map((k) => (
            <li
              key={k.key_prefix}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <code>{k.key_prefix}…</code> · created{" "}
                  {new Date(k.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => revoke(k.key_prefix)}
                className="text-sm text-red-600"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
