import { Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";

interface DeckListVerifyPanelProps {
  email: string;
}

/**
 * Shown in place of the deck list while the account's email is unverified.
 * `VerifyBanner` (in ProtectedRoute) owns the resend action, so this panel
 * deliberately does not repeat it — it explains why the list is empty and
 * points at the onboarding guide instead.
 */
export function DeckListVerifyPanel({ email }: DeckListVerifyPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
      <h2 className="mb-1 font-medium text-amber-900 dark:text-amber-200">
        {t("decks.verifyTitle")}
      </h2>
      <p className="text-sm text-amber-800 dark:text-amber-300">
        <Trans
          i18nKey="decks.verifyBody"
          values={{ email }}
          components={[
            <Link
              key="0"
              to="/help/getting-started"
              className="font-medium underline"
            />,
          ]}
        />
      </p>
    </div>
  );
}

export function DeckListEmptyHint() {
  const { t } = useTranslation();
  return (
    <div className="text-gray-500 dark:text-gray-400">
      <p>{t("decks.empty")}</p>
      <p className="mt-1 text-sm">
        <Trans
          i18nKey="decks.emptyHint"
          components={[
            <Link
              key="0"
              to="/help/getting-started"
              className="text-indigo-600 underline"
            />,
          ]}
        />
      </p>
    </div>
  );
}

export function DeckListLegendHint() {
  return (
    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
      <Trans
        i18nKey="decks.legendHint"
        components={[
          <Link
            key="0"
            to="/help/studying#counters"
            className="text-indigo-600 underline"
          />,
        ]}
      />
    </p>
  );
}
