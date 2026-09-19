import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, helpH2, Code } from "./HelpShell";

const DIAGNOSTIC_EXAMPLE = `**14. A cell divides producing four genetically distinct haploid cells. This is:**

- Meiosis -> correct
- Mitosis -> confusion-mitosis
- Binary fission -> end
Meiosis: two divisions, four genetically distinct haploid cells.

[confusion-mitosis]
**15. You mixed these up. Mitosis produces:**
Two genetically IDENTICAL diploid cells. Meiosis = gametes, variety, halved chromosomes.`;

const SENSE_EXAMPLE = `**1. der Zug**
- train | Der Zug fährt um 8 Uhr ab. | Eisenbahn
- move (in chess) | Das war ein guter Zug! | Schach
- draught | Es zieht, mach das Fenster zu. | Luft`;

const READING_EXAMPLE = `@read
**5. How a dot product measures similarity**
A dot product multiplies matching entries and adds them up.

- large and positive: the vectors point the same way
- near zero: unrelated`;

export function AdvancedCardsPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.advancedCards.metaTitle"),
    description: t("help.advancedCards.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.advancedCards.title")}
      nextTo="/help/branching-decks"
      nextTitle={t("help.index.topics.branchingDecks.title")}
    >
      <section id="diagnostic" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.advancedCards.diagnosticHeading")}</h2>
        <p className="mt-2">{t("help.advancedCards.diagnosticIntro")}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("help.advancedCards.diagnosticCorrect")}</li>
          <li>{t("help.advancedCards.diagnosticRemediation")}</li>
          <li>{t("help.advancedCards.diagnosticEnd")}</li>
        </ul>
        <p className="mt-2">{t("help.advancedCards.diagnosticStudy")}</p>
        <p className="mt-3 font-medium">
          {t("help.advancedCards.diagnosticExampleCaption")}
        </p>
        <Code>{DIAGNOSTIC_EXAMPLE}</Code>
      </section>

      <section id="senses" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.advancedCards.sensesHeading")}</h2>
        <p className="mt-2">{t("help.advancedCards.sensesIntro")}</p>
        <p className="mt-2">{t("help.advancedCards.sensesPhases")}</p>
        <p className="mt-3 font-medium">
          {t("help.advancedCards.sensesExampleCaption")}
        </p>
        <Code>{SENSE_EXAMPLE}</Code>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {t("help.advancedCards.sensesNote")}
        </p>
      </section>

      <section id="reading" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.advancedCards.readingHeading")}</h2>
        <p className="mt-2">{t("help.advancedCards.readingIntro")}</p>
        <p className="mt-2">{t("help.advancedCards.readingBody")}</p>
        <p className="mt-3 font-medium">
          {t("help.advancedCards.readingExampleCaption")}
        </p>
        <Code>{READING_EXAMPLE}</Code>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {t("help.advancedCards.readingLimits")}
        </p>
      </section>
    </HelpTopicShell>
  );
}
