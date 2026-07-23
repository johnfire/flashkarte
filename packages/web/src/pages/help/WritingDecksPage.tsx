import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, helpH2, Code } from "./HelpShell";

const FORMAT_EXAMPLE = `# Spanish Basics
*A starter deck*

## Greetings

**1. hola**
hello

**2. buenos días**
good morning
Used until about noon.

## Numbers

Q: uno
A: one

Q: dos
A: two`;

export function WritingDecksPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.writingDecks.metaTitle"),
    description: t("help.writingDecks.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.writingDecks.title")}
      nextTo="/help/branching-decks"
      nextTitle={t("help.index.topics.branchingDecks.title")}
    >
      <section id="ways" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.writingDecks.waysHeading")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.writingDecks.waysWeb")}</li>
          <li>{t("help.writingDecks.waysAndroid")}</li>
          <li>{t("help.writingDecks.waysAI")}</li>
        </ul>
      </section>

      <section id="format" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.writingDecks.formatHeading")}</h2>
        <p className="mt-2">{t("help.writingDecks.formatIntro")}</p>
        <p className="mt-2">{t("help.writingDecks.formatCardsIntro")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.writingDecks.formatBold")}</li>
          <li>{t("help.writingDecks.formatQA")}</li>
          <li>{t("help.writingDecks.formatParagraphs")}</li>
        </ul>
        <p className="mt-3 font-medium">
          {t("help.writingDecks.formatExampleCaption")}
        </p>
        <Code>{FORMAT_EXAMPLE}</Code>
      </section>

      <section id="settings" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.writingDecks.settingsHeading")}</h2>
        <p className="mt-2">{t("help.writingDecks.settingsOrdered")}</p>
      </section>
    </HelpTopicShell>
  );
}
