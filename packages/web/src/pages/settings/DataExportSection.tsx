import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";

export function DataExportSection() {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const data = await api.auth.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flashkarte-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.exportError"),
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="mb-1 text-xl font-semibold">{t("settings.dataExport")}</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.dataExportHint")}
      </p>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:hover:bg-indigo-950"
      >
        {downloading ? "…" : t("settings.dataExportButton")}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
