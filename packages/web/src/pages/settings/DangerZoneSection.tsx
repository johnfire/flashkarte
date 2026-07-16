import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { PasswordInput } from "../../components/PasswordInput";

export function DangerZoneSection() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPassword("");
    setConfirmText("");
    setError(null);
  }

  async function deleteAccount() {
    if (confirmText !== "DELETE") {
      setError(t("settings.deleteConfirmMismatch"));
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.auth.deleteAccount(password);
      await logout();
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.deleteError"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mb-8 rounded-lg border border-red-200 p-4 dark:border-red-900/50">
      <h2 className="mb-1 text-xl font-semibold text-red-700 dark:text-red-400">
        {t("settings.dangerZone")}
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.deleteAccountHint")}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
      >
        {t("settings.deleteAccountButton")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={close}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
              {t("settings.deleteAccountModalTitle")}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {t("settings.deleteAccountModalBody")}
            </p>

            <label
              htmlFor="delete-password"
              className="mb-1 block text-sm font-medium"
            >
              {t("settings.currentPassword")}
            </label>
            <PasswordInput
              id="delete-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              ariaLabel={t("settings.currentPassword")}
            />

            <label
              htmlFor="delete-confirm"
              className="mb-1 mt-4 block text-sm font-medium"
            >
              {t("settings.deleteConfirmLabel")}
            </label>
            <input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-lg border px-3 py-2"
            />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={deleting}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "…" : t("settings.deleteConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
