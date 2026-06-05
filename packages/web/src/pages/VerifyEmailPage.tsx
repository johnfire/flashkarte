import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";

type Status = "verifying" | "success" | "error";

export function VerifyEmailPage() {
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
      setMessage("This link is missing its verification token.");
      return;
    }
    api.auth
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "Could not verify your email. Please try again.",
        );
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 text-center shadow">
        <h1 className="text-2xl font-bold">flashkarte</h1>
        {status === "verifying" && (
          <p className="text-gray-500">Verifying your email…</p>
        )}
        {status === "success" && (
          <>
            <p className="text-green-600">Your email is verified. Thanks!</p>
            <Link
              to="/"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
            >
              Go to flashkarte
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600">{message}</p>
            <Link to="/" className="inline-block text-sm text-indigo-600">
              Back to flashkarte
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
