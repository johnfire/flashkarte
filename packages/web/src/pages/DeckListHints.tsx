import { Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";

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
