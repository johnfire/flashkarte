import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.auth.forgotPassword(email);
    } catch {
      // Intentionally ignore — the response is uniform either way.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white dark:bg-gray-800 p-8 shadow">
        <h1 className="text-2xl font-bold">Reset password</h1>
        {sent ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              If that email has an account, a reset link is on its way. Check
              your inbox (and spam).
            </p>
            <Link to="/login" className="inline-block text-sm text-indigo-600">
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
            >
              {busy ? "…" : "Send reset link"}
            </button>
            <Link
              to="/login"
              className="block text-center text-sm text-indigo-600"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
