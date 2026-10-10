import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { Code, HelpTopicShell, helpH2 } from "./HelpShell";

export function ContentImportGuidePage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.importingContent.metaTitle"),
    description: t("help.importingContent.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.importingContent.title")}
      nextTo="/help/ai"
      nextTitle={t("help.index.topics.ai.title")}
    >
      <AiSection />
      <DeckSection />
      <CollectionSection />
      <GuidanceSections />
    </HelpTopicShell>
  );
}

function AiSection() {
  const { t } = useTranslation();
  return (
    <section id="two-ways" className="scroll-mt-6">
      <p>{t("help.importingContent.intro")}</p>
      <h2 className={`${helpH2} mt-6`}>
        {t("help.importingContent.aiHeading")}
      </h2>
      <p className="mt-2">{t("help.importingContent.aiBody")}</p>
      <p className="mt-3">
        <Link to="/settings" className="text-indigo-600 underline">
          {t("help.importingContent.aiSettingsLink")}
        </Link>
      </p>
      <p className="mt-2">
        <Link to="/help/ai" className="text-indigo-600 underline">
          {t("help.importingContent.aiGuideLink")}
        </Link>
      </p>
    </section>
  );
}

function DeckSection() {
  const { t } = useTranslation();
  return (
    <section id="one-deck" className="scroll-mt-6">
      <h2 className={helpH2}>{t("help.importingContent.deckHeading")}</h2>
      <p className="mt-2">{t("help.importingContent.deckBody")}</p>
      <Code>{`front,answer,explanation
Bonjour,Hello,"A friendly greeting in French."`}</Code>
      <p className="mt-3">
        <a
          href="/templates/flashcard-deck.csv"
          download
          className="text-indigo-600 underline"
        >
          {t("help.importingContent.deckTemplateLink")}
        </a>
      </p>
      <p className="mt-2">{t("help.importingContent.deckSteps")}</p>
      <Link to="/decks/new" className="text-indigo-600 underline">
        {t("help.importingContent.newDeckLink")}
      </Link>
    </section>
  );
}

function CollectionSection() {
  const { t } = useTranslation();
  return (
    <section id="deck-collection" className="scroll-mt-6">
      <h2 className={helpH2}>{t("help.importingContent.collectionHeading")}</h2>
      <p className="mt-2">{t("help.importingContent.collectionBody")}</p>
      <CollectionSheetDetails />
      <p className="mt-3">{t("help.importingContent.collectionFormat")}</p>
      <CollectionTemplates />
      <p className="mt-3">{t("help.importingContent.collectionSteps")}</p>
      <Link to="/courses/import" className="text-indigo-600 underline">
        {t("help.importingContent.collectionImportLink")}
      </Link>
    </section>
  );
}

function CollectionSheetDetails() {
  const { t } = useTranslation();
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5">
      <li>
        <strong>Course</strong> — {t("help.importingContent.courseSheet")}
      </li>
      <li>
        <strong>Decks</strong> — {t("help.importingContent.decksSheet")}
      </li>
      <li>
        <strong>Cards</strong> — {t("help.importingContent.cardsSheet")}
      </li>
    </ul>
  );
}

function CollectionTemplates() {
  const { t } = useTranslation();
  const templates = [
    ["/templates/flashcard-course.csv", "imports.downloadCourse"],
    ["/templates/flashcard-decks.csv", "imports.downloadDecks"],
    ["/templates/flashcard-cards.csv", "imports.downloadCards"],
  ] as const;
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {templates.map(([href, key]) => (
        <a
          key={href}
          href={href}
          download
          className="text-indigo-600 underline"
        >
          {t(key)}
        </a>
      ))}
    </div>
  );
}

function GuidanceSections() {
  const { t } = useTranslation();
  return (
    <>
      <section id="combine" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.importingContent.combineHeading")}</h2>
        <p className="mt-2">{t("help.importingContent.combineBody")}</p>
      </section>
      <section id="limit" className="scroll-mt-6">
        <h2 className={helpH2}>{t("help.importingContent.limitHeading")}</h2>
        <p className="mt-2">{t("help.importingContent.limitBody")}</p>
      </section>
    </>
  );
}
