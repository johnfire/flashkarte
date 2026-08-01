import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { ApiKey, CreatedApiKey } from "../../api/types";

const MCP_URL =
  import.meta.env.VITE_MCP_URL ??
  "https://mcp.flashkarte.christopherrehm.de/mcp";

export function ApiKeysSection() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("My AI");
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setKeys(await api.keys.list());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.loadKeysError"),
      );
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const key = await api.keys.create(newName.trim() || "My AI");
      setCreated(key);
      setKeys((k) => (k ? [{ ...key }, ...k] : [key]));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("settings.createKeyError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(prefix: string) {
    if (!window.confirm(t("settings.revokeConfirm"))) return;
    try {
      await api.keys.revoke(prefix);
      setKeys((k) => (k ? k.filter((x) => x.key_prefix !== prefix) : k));
      if (created?.key_prefix === prefix) setCreated(null);
    } catch {
      window.alert(t("settings.revokeError"));
    }
  }

  return (
    <section className="mb-8 rounded-lg border p-4">
      <h2 className="mb-1 text-xl font-semibold">{t("settings.connectAI")}</h2>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.connectAIHint")}
      </p>
      <p className="mb-2 text-sm">
        {t("settings.mcpUrlLabel")}{" "}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
          {MCP_URL}
        </code>
      </p>
      <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
        {t("settings.claudeAiHint")} <em>{t("settings.claudeAiExample")}</em>
      </p>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Trans
          i18nKey="settings.aiLearnMore"
          components={[
            <Link
              key="0"
              to="/help/ai"
              className="text-indigo-600 underline"
            />,
          ]}
        />
      </p>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("settings.keyNamePlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : t("settings.generateKey")}
        </button>
      </div>

      {created && <CreatedKeyNotice keyData={created} />}

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">{t("settings.yourKeys")}</h2>
        {error && <p className="mb-3 text-red-600">{error}</p>}
        {keys === null && !error && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("common.loading")}
          </p>
        )}
        {keys && keys.length === 0 && !error && (
          <p className="text-gray-500 dark:text-gray-400">
            {t("settings.noKeys")}
          </p>
        )}
        <ul className="space-y-2">
          {keys?.map((k) => (
            <li
              key={k.key_prefix}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <code>{k.key_prefix}…</code> · {t("settings.created")}{" "}
                  {new Date(k.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(k.key_prefix)}
                className="text-sm text-red-600"
              >
                {t("settings.revoke")}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

interface CreatedKeyNoticeProps {
  keyData: CreatedApiKey;
}

function CreatedKeyNotice({ keyData }: CreatedKeyNoticeProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="mb-1 text-sm font-medium text-amber-800">
        {t("settings.copyKeyWarning")}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-white px-2 py-1 text-sm dark:bg-gray-800">
          {keyData.key}
        </code>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(keyData.key)}
          className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white"
        >
          {t("settings.copy")}
        </button>
      </div>
    </div>
  );
}
