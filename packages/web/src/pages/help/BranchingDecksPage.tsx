import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";
import { HelpTopicShell, Code } from "./HelpShell";

const BRANCHING_EXAMPLE = `# Forest Path

[start]
**1. You reach a fork. Which way?**
- Go left toward the cave -> cave
- Go right -> meadow

[cave]
**2. A bear blocks the cave.**
- Sneak past -> treasure
- Retreat -> start

[meadow]
**3. A peaceful clearing.**
You rest here.`;

export function BranchingDecksPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.branchingDecks.metaTitle"),
    description: t("help.branchingDecks.metaDescription"),
  });

  return (
    <HelpTopicShell
      title={t("help.branchingDecks.title")}
      nextTo="/help/studying"
      nextTitle={t("help.index.topics.studying.title")}
    >
      <section id="branching" className="scroll-mt-6">
        <p className="mt-2">{t("help.branchingDecks.body")}</p>
        <p className="mt-3 font-medium">
          {t("help.branchingDecks.exampleCaption")}
        </p>
        <Code>{BRANCHING_EXAMPLE}</Code>
      </section>
    </HelpTopicShell>
  );
}
