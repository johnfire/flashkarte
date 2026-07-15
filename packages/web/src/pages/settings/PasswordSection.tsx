import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { PasswordInput } from "../../components/PasswordInput";

export function PasswordSection() {
  const { t } = useTranslation();
  const { updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function changePassword() {
    setPasswordChanged(false);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(t("settings.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    setChangingPassword(true);
    try {
      const { user } = await api.auth.changePassword(
        currentPassword,
        newPassword,
      );
      updateUser(user);
      setPasswordChanged(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError
          ? err.message
          : t("settings.changePasswordError"),
      );
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <section className="mb-8 rounded-lg border p-4">
      <h2 className="mb-1 text-xl font-semibold">
        {t("settings.changePassword")}
      </h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.changePasswordHint")}
      </p>
      <div className="flex flex-col gap-3">
        <PasswordField
          id="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          label={t("settings.currentPassword")}
          autoComplete="current-password"
        />
        <PasswordField
          id="new-password"
          value={newPassword}
          onChange={setNewPassword}
          label={t("settings.newPassword")}
          autoComplete="new-password"
          minLength={8}
        />
        <PasswordField
          id="confirm-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          label={t("settings.confirmPassword")}
          autoComplete="new-password"
          minLength={8}
        />
        <button
          type="button"
          onClick={changePassword}
          disabled={
            changingPassword ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {changingPassword ? "…" : t("settings.changePasswordButton")}
        </button>
      </div>
      {passwordChanged && (
        <p className="mt-2 text-sm text-green-600">
          {t("settings.passwordChanged")}
        </p>
      )}
      {passwordError && (
        <p className="mt-2 text-sm text-red-600">{passwordError}</p>
      )}
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/forgot-password" className="text-indigo-600">
          {t("settings.forgotPasswordLink")}
        </Link>
      </p>
    </section>
  );
}

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}

function PasswordField({
  id,
  value,
  onChange,
  label,
  autoComplete,
  minLength,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <PasswordInput
        id={id}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        ariaLabel={label}
      />
    </div>
  );
}
