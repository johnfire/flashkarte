import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./i18n";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./auth/AuthContext";
import { reportClientError } from "./api/client";
import "./index.css";

window.addEventListener("error", (event) => {
  reportClientError({
    message: event.message || String(event.error),
    stack: event.error?.stack,
    context: "window.onerror",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as
    { message?: string; stack?: string } | undefined;
  reportClientError({
    message: reason?.message ?? String(event.reason),
    stack: reason?.stack,
    context: "unhandledrejection",
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
