import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, helpH2 } from "./HelpShell";

export function SharingPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.sharing.metaTitle"),
    description: t("help.sharing.metaDescription"),
  });

  return (
    <HelpTopicShell title={t("help.sharing.title")}>
      <section id="public" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.sharing.publicHeading")}</h2>
        <p className="mt-2">{t("help.sharing.publicBody")}</p>
      </section>

      <section id="explore" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.sharing.exploreHeading")}</h2>
        <p className="mt-2">{t("help.sharing.exploreBody")}</p>
      </section>

      <section id="library" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.sharing.libraryHeading")}</h2>
        <p className="mt-2">{t("help.sharing.libraryBody")}</p>
      </section>
    </HelpTopicShell>
  );
}
