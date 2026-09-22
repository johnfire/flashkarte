import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CommunityFlashcardDeckLibrarySection } from "./CommunityFlashcardDeckLibrarySection";
import { OfficialFlashcardDeckLibrarySection } from "./OfficialFlashcardDeckLibrarySection";
import { StructuredCourseLibrarySection } from "./StructuredCourseLibrarySection";

export function LibraryHubPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("libraryHub.title")}</h1>
        <nav
          aria-label={t("libraryHub.navigation")}
          className="flex gap-3 text-sm text-indigo-600"
        >
          <Link to="/learn">{t("libraryHub.myCourses")}</Link>
          <Link to="/">{t("libraryHub.myDecks")}</Link>
        </nav>
      </header>
      <div className="space-y-10">
        <StructuredCourseLibrarySection source="official" />
        <OfficialFlashcardDeckLibrarySection />
        <StructuredCourseLibrarySection source="community" />
        <CommunityFlashcardDeckLibrarySection />
      </div>
    </main>
  );
}
