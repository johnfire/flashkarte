import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AdminUser, AccountType } from "../api/types";

const ACCOUNT_TYPES: AccountType[] = ["free", "paid", "admin-gifted", "admin"];

const TYPE_LABEL: Record<AccountType, string> = {
  free: "Free",
  paid: "Paid",
  "admin-gifted": "Gifted",
  admin: "Admin",
};

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // create-user form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("free");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { users } = await api.admin.listUsers();
      setUsers(users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load users");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    setError(null);
    try {
      const { user } = await api.admin.createUser(
        email.trim(),
        password,
        accountType,
      );
      setUsers((u) => (u ? [user, ...u] : [user]));
      setCreateMsg(`Created ${user.email}`);
      setEmail("");
      setPassword("");
      setAccountType("free");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't create the user",
      );
    } finally {
      setCreating(false);
    }
  }

  async function changeType(id: string, type: AccountType) {
    const prev = users;
    setUsers((u) =>
      u ? u.map((x) => (x.id === id ? { ...x, accountType: type } : x)) : u,
    );
    try {
      await api.admin.setAccountType(id, type);
    } catch (err) {
      setUsers(prev ?? null); // revert
      setError(
        err instanceof ApiError ? err.message : "Couldn't update account type",
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← Decks
        </Link>
      </header>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="mb-3 text-xl font-semibold">Create user</h2>
        <form onSubmit={createUser} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 rounded-lg border px-3 py-2"
            />
            <input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Initial password (8+ chars)"
              className="flex-1 rounded-lg border px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              className="rounded-lg border bg-white px-3 py-2 dark:bg-gray-800"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {creating ? "…" : "Create user"}
            </button>
            {createMsg && (
              <span className="text-sm text-green-600">{createMsg}</span>
            )}
          </div>
        </form>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          New users are created already verified.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Users{users ? ` (${users.length})` : ""}
        </h2>
        {users === null && !error && (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        )}
        <ul className="space-y-2">
          {users?.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{u.email}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {u.emailVerifiedAt ? "verified" : "unverified"} · joined{" "}
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
              <select
                value={u.accountType}
                onChange={(e) =>
                  changeType(u.id, e.target.value as AccountType)
                }
                className="rounded-lg border bg-white px-2 py-1 text-sm dark:bg-gray-800"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
