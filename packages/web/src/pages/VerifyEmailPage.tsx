import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";

type Status = "verifying" | "success" | "error";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React 18 StrictMode double-invoke
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage(t("verifyEmail.missingToken"));
      return;
    }
    api.auth
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof ApiError ? err.message : t("verifyEmail.genericError"),
        );
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white dark:bg-gray-800 p-8 text-center shadow">
        <h1 className="text-2xl font-bold">flashkarte</h1>
        {status === "verifying" && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("verifyEmail.verifying")}
          </p>
        )}
        {status === "success" && (
          <>
            <p className="text-green-600">{t("verifyEmail.success")}</p>
            <Link
              to="/"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
            >
              {t("verifyEmail.goToApp")}
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600">{message}</p>
            <Link to="/" className="inline-block text-sm text-indigo-600">
              {t("verifyEmail.back")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
