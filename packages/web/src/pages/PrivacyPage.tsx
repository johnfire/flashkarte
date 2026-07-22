import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { resetAnalyticsConsent } from "../components/AnalyticsConsentBanner";
import { useDocumentHead } from "../seo/useDocumentHead";

export function PrivacyPage() {
  useDocumentHead({
    title: "Privacy Policy — flashkarte",
    description:
      "How flashkarte handles your data: what we collect, what we never do, and your rights.",
  });
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white dark:bg-gray-800 px-6 py-8 shadow sm:px-10">
        <Link to="/login" className="text-sm text-indigo-600">
          {t("privacy.back")}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{t("privacy.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("privacy.lastUpdated", { date: "22 July 2026" })}
        </p>

        <div className="prose prose-sm mt-6 max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p>
            <Trans
              i18nKey="privacy.intro"
              components={[
                <a
                  key="0"
                  className="text-indigo-600 underline"
                  href="mailto:car2187bus@pm.me"
                />,
              ]}
            />
          </p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.collectHeading")}
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <Trans
                  i18nKey="privacy.collectAccount"
                  components={[<strong key="0" />]}
                />
              </li>
              <li>
                <Trans
                  i18nKey="privacy.collectContent"
                  components={[<strong key="0" />]}
                />
              </li>
              <li>
                <Trans
                  i18nKey="privacy.collectApiKeys"
                  components={[<strong key="0" />]}
                />
              </li>
              <li>
                <Trans
                  i18nKey="privacy.collectDiagnostics"
                  components={[<strong key="0" />]}
                />
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.dontHeading")}
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("privacy.dontAds")}</li>
              <li>{t("privacy.dontSell")}</li>
              <li>{t("privacy.dontTrain")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.analyticsHeading")}
            </h2>
            <p className="mt-2">{t("privacy.analyticsBody")}</p>
            <button
              className="mt-3 rounded border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300"
              onClick={resetAnalyticsConsent}
            >
              {t("privacy.analyticsChange")}
            </button>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.aiHeading")}
            </h2>
            <p className="mt-2">
              <Trans i18nKey="privacy.aiBody" components={[<em key="0" />]} />
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.recipientsHeading")}
            </h2>
            <p className="mt-2">{t("privacy.recipientsBody")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.storageHeading")}
            </h2>
            <p className="mt-2">{t("privacy.storageBody")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.retentionHeading")}
            </h2>
            <p className="mt-2">
              <Trans
                i18nKey="privacy.retentionBody"
                components={[
                  <a
                    key="0"
                    className="text-indigo-600 underline"
                    href="mailto:car2187bus@pm.me"
                  />,
                ]}
              />
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.childrenHeading")}
            </h2>
            <p className="mt-2">{t("privacy.childrenBody")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.rightsHeading")}
            </h2>
            <p className="mt-2">{t("privacy.rightsBody")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("privacy.changesHeading")}
            </h2>
            <p className="mt-2">{t("privacy.changesBody")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
