import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const CONSENT_KEY = "flashkarte.analytics-consent";
const CONSENT_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
const UMAMI_SCRIPT_ID = "flashkarte-umami";

type Consent = "accepted" | "rejected";

function savedConsent(): Consent | undefined {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (!stored) return undefined;
  const [decision, expiresAt] = stored.split(":");
  if (Number(expiresAt) <= Date.now()) return undefined;
  return decision === "accepted" || decision === "rejected"
    ? decision
    : undefined;
}

function loadAnalytics(): void {
  if (location.search || document.getElementById(UMAMI_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = UMAMI_SCRIPT_ID;
  script.defer = true;
  script.src = "https://stats.christopherrehm.de/script.js";
  script.dataset.websiteId = "cb5832ad-8bb6-4c86-b554-9b5b63b90bd2";
  document.head.append(script);
}

export function resetAnalyticsConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
  location.reload();
}

export function AnalyticsConsentBanner() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<Consent | undefined>(() =>
    savedConsent(),
  );

  useEffect(() => {
    if (consent === "accepted") loadAnalytics();
  }, [consent]);

  if (consent) return null;

  const choose = (decision: Consent) => {
    localStorage.setItem(
      CONSENT_KEY,
      `${decision}:${Date.now() + CONSENT_DURATION_MS}`,
    );
    setConsent(decision);
  };

  return (
    <aside
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-lg bg-gray-900 p-4 text-sm text-white shadow-lg"
      aria-label={t("analyticsConsent.label")}
    >
      <p>{t("analyticsConsent.body")}</p>
      <div className="mt-3 flex gap-3">
        <button
          className="pointer-events-auto rounded bg-indigo-600 px-3 py-2 font-medium"
          onClick={() => choose("accepted")}
        >
          {t("analyticsConsent.accept")}
        </button>
        <button
          className="pointer-events-auto rounded border border-gray-400 px-3 py-2 font-medium"
          onClick={() => choose("rejected")}
        >
          {t("analyticsConsent.reject")}
        </button>
      </div>
    </aside>
  );
}
