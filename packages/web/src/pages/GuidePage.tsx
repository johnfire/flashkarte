import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../seo/useDocumentHead";

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

const SECTION_IDS = [
  "start",
  "create",
  "format",
  "branching",
  "settings",
  "study",
  "ai",
] as const;

const SECTION_LABEL_KEYS: Record<(typeof SECTION_IDS)[number], string> = {
  start: "guide.tocStart",
  create: "guide.tocCreate",
  format: "guide.tocFormat",
  branching: "guide.tocBranching",
  settings: "guide.tocSettings",
  study: "guide.tocStudy",
  ai: "guide.tocAI",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-100 p-4 text-xs leading-relaxed text-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <code>{children}</code>
    </pre>
  );
}

export function GuidePage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("guide.metaTitle"),
    description: t("guide.metaDescription"),
  });

  const toc: [string, string][] = SECTION_IDS.map((id) => [
    id,
    t(SECTION_LABEL_KEYS[id]),
  ]);

  const h2 = "text-lg font-semibold text-gray-900 dark:text-gray-100";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white dark:bg-gray-800 px-6 py-8 shadow sm:px-10">
        <Link to="/" className="text-sm text-indigo-600">
          {t("guide.back")}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{t("guide.title")}</h1>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          {t("guide.intro")}
        </p>

        <nav
          aria-label={t("guide.tocHeading")}
          className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/40"
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("guide.tocHeading")}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-indigo-600">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="prose prose-sm mt-8 max-w-none space-y-8 text-gray-700 dark:text-gray-300">
          <section id="start" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.startHeading")}</h2>
            <p className="mt-2">{t("guide.startBody")}</p>
          </section>

          <section id="create" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.createHeading")}</h2>
            <p className="mt-2">{t("guide.createIntro")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("guide.createWeb")}</li>
              <li>{t("guide.createAndroid")}</li>
              <li>{t("guide.createAI")}</li>
            </ul>
          </section>

          <section id="format" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.formatHeading")}</h2>
            <p className="mt-2">{t("guide.formatIntro")}</p>
            <p className="mt-2">{t("guide.formatCardsIntro")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("guide.formatBold")}</li>
              <li>{t("guide.formatQA")}</li>
              <li>{t("guide.formatParagraphs")}</li>
            </ul>
            <p className="mt-3 font-medium">
              {t("guide.formatExampleCaption")}
            </p>
            <Code>{FORMAT_EXAMPLE}</Code>
          </section>

          <section id="branching" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.branchingHeading")}</h2>
            <p className="mt-2">{t("guide.branchingBody")}</p>
            <p className="mt-3 font-medium">
              {t("guide.branchingExampleCaption")}
            </p>
            <Code>{BRANCHING_EXAMPLE}</Code>
          </section>

          <section id="settings" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.settingsHeading")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t("guide.settingsOrdered")}</li>
              <li>{t("guide.settingsPublic")}</li>
            </ul>
          </section>

          <section id="study" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.studyHeading")}</h2>
            <p className="mt-2">{t("guide.studySrs")}</p>
            <p className="mt-2">{t("guide.studyRatings")}</p>
            <p className="mt-2">{t("guide.studyChoice")}</p>
          </section>

          <section id="ai" className="scroll-mt-6">
            <h2 className={h2}>{t("guide.aiHeading")}</h2>
            <p className="mt-2">{t("guide.aiBody")}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t("guide.aiStep1")}</li>
              <li>{t("guide.aiStep2")}</li>
              <li>{t("guide.aiStep3")}</li>
            </ol>
            <p className="mt-3">
              <Link to="/settings" className="text-indigo-600">
                {t("guide.tocAI")} →
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
