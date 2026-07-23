import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, helpH2 } from "./HelpShell";

export function StudyingPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.studying.metaTitle"),
    description: t("help.studying.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.studying.title")}
      nextTo="/help/ai"
      nextTitle={t("help.index.topics.ai.title")}
    >
      <section id="srs" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.studying.srsHeading")}</h2>
        <p className="mt-2">{t("help.studying.srsBody")}</p>
      </section>

      <section id="ratings" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.studying.ratingsHeading")}</h2>
        <p className="mt-2">{t("help.studying.ratingsIntro")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.studying.ratingAgain")}</li>
          <li>{t("help.studying.ratingHard")}</li>
          <li>{t("help.studying.ratingGood")}</li>
          <li>{t("help.studying.ratingEasy")}</li>
        </ul>
      </section>

      <section id="counters" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.studying.countersHeading")}</h2>
        <p className="mt-2">{t("help.studying.countersIntro")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.studying.counterDue")}</li>
          <li>{t("help.studying.counterNew")}</li>
          <li>{t("help.studying.counterViewed")}</li>
          <li>{t("help.studying.counterAgain")}</li>
          <li>{t("help.studying.counterHard")}</li>
          <li>{t("help.studying.counterGood")}</li>
          <li>{t("help.studying.counterEasy")}</li>
        </ul>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("help.studying.counterNote")}
        </p>
      </section>

      <section id="choice" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.studying.choiceHeading")}</h2>
        <p className="mt-2">{t("help.studying.choiceBody")}</p>
      </section>
    </HelpTopicShell>
  );
}
