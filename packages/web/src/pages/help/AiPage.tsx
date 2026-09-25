import { Link } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, helpH2 } from "./HelpShell";

export function AiPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.ai.metaTitle"),
    description: t("help.ai.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.ai.title")}
      nextTo="/help/sharing"
      nextTitle={t("help.index.topics.sharing.title")}
    >
      <section id="ai" className="scroll-mt-6">
        <p className="mt-2">{t("help.ai.body")}</p>
        <h2 className={`${helpH2} mt-6`}>{t("help.ai.typesHeading")}</h2>
        <p className="mt-2">{t("help.ai.typesBody")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.ai.flashcardDeck")}</li>
          <li>{t("help.ai.deckCollection")}</li>
          <li>{t("help.ai.structuredCourse")}</li>
        </ul>
        <h2 className={`${helpH2} mt-6`}>{t("help.ai.askHeading")}</h2>
        <p className="mt-2">{t("help.ai.askBody")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t("help.ai.step1")}</li>
          <li>{t("help.ai.step2")}</li>
          <li>{t("help.ai.step3")}</li>
        </ol>
        <p className="mt-3">
          <Link to="/settings" className="text-indigo-600">
            {t("help.ai.settingsLink")}
          </Link>
        </p>
        <p className="mt-3 text-sm">
          <Trans
            i18nKey="help.ai.agentsNote"
            components={[
              <a key="llms" href="/llms.txt" className="text-indigo-600" />,
            ]}
          />
        </p>
      </section>
    </HelpTopicShell>
  );
}
