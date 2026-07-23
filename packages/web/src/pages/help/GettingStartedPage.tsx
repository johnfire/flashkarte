import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, helpH2 } from "./HelpShell";

export function GettingStartedPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.gettingStarted.metaTitle"),
    description: t("help.gettingStarted.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.gettingStarted.title")}
      nextTo="/help/writing-decks"
      nextTitle={t("help.index.topics.writingDecks.title")}
    >
      <section id="signup" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.gettingStarted.signupHeading")}</h2>
        <p className="mt-2">{t("help.gettingStarted.signupBody")}</p>
      </section>

      <section id="loop" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.gettingStarted.loopHeading")}</h2>
        <p className="mt-2">{t("help.gettingStarted.loopBody")}</p>
      </section>

      <section id="map" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.gettingStarted.mapHeading")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.gettingStarted.mapDecks")}</li>
          <li>{t("help.gettingStarted.mapLibrary")}</li>
          <li>{t("help.gettingStarted.mapExplore")}</li>
          <li>{t("help.gettingStarted.mapSettings")}</li>
        </ul>
      </section>
    </HelpTopicShell>
  );
}
