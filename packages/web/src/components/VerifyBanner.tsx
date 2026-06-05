import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

// Soft email-verification nudge: shown in the app when the current user's
// email isn't verified yet. Lets them resend the verification link.
export function VerifyBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerifiedAt) return null;

  async function resend() {
    setBusy(true);
    try {
      await api.auth.resendVerification();
      setSent(true);
    } catch {
      // surfaced via the banner staying put; non-critical
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <span>
        Please verify your email ({user.email}) to secure your account.
      </span>
      {sent ? (
        <span className="font-medium">Verification email sent.</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="font-medium text-amber-900 underline disabled:opacity-50 dark:text-amber-200"
        >
          {busy ? "Sending…" : "Resend email"}
        </button>
      )}
    </div>
  );
}
