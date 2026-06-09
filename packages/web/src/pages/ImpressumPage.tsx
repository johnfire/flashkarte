import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

export function ImpressumPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl rounded-xl bg-white px-6 py-8 shadow sm:px-10 dark:bg-gray-800">
        <Link to="/login" className="text-sm text-indigo-600">
          {t("impressum.back")}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{t("impressum.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("impressum.subtitle")}
        </p>

        <div className="mt-6 space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("impressum.providerHeading")}
            </h2>
            <p className="mt-2">
              Christopher Rehm
              <br />
              Alpenstr. 3<br />
              86836 Klosterlechfeld
              <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("impressum.contactHeading")}
            </h2>
            <p className="mt-2">
              {t("impressum.phoneLabel")}{" "}
              <a className="text-indigo-600" href="tel:+4982060154">
                +49 8206 0154
              </a>
              <br />
              {t("impressum.emailLabel")}{" "}
              <a className="text-indigo-600" href="mailto:car2187bus@pm.me">
                car2187bus@pm.me
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("impressum.responsibleHeading")}
            </h2>
            <p className="mt-2">{t("impressum.responsibleBody")}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("impressum.disputeHeading")}
            </h2>
            <p className="mt-2">
              <Trans
                i18nKey="impressum.disputeBody"
                components={[
                  <a
                    key="0"
                    className="text-indigo-600"
                    href="https://ec.europa.eu/consumers/odr/"
                    target="_blank"
                    rel="noopener noreferrer"
                  />,
                ]}
              />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
