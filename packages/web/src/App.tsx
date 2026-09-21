import { Routes, Route, Navigate } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { CreateDeckPage } from "./pages/CreateDeckPage";
import { StudyPage } from "./pages/StudyPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ImpressumPage } from "./pages/ImpressumPage";
import { HelpIndexPage } from "./pages/help/HelpIndexPage";
import { GettingStartedPage } from "./pages/help/GettingStartedPage";
import { WritingDecksPage } from "./pages/help/WritingDecksPage";
import { AdvancedCardsPage } from "./pages/help/AdvancedCardsPage";
import { BranchingDecksPage } from "./pages/help/BranchingDecksPage";
import { StudyingPage } from "./pages/help/StudyingPage";
import { AiPage } from "./pages/help/AiPage";
import { SharingPage } from "./pages/help/SharingPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { HomeRoute } from "./components/HomeRoute";
import { LibraryPage } from "./pages/LibraryPage";
import { AppDecksPage } from "./pages/AppDecksPage";
import { AppDecksCollectionPage } from "./pages/AppDecksCollectionPage";
import { ExplorePage } from "./pages/ExplorePage";
import { PublicDeckPage } from "./pages/PublicDeckPage";
import { ManageDeckCardsPage } from "./pages/ManageDeckCardsPage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { CoursesPage } from "./pages/CoursesPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { PublicCoursesPage } from "./pages/PublicCoursesPage";
import { EditCardPage } from "./pages/EditCardPage";
import { SenseReorderPage } from "./pages/SenseReorderPage";
import { LearnPage } from "./learn/LearnPage";
import { OutlinePage } from "./learn/OutlinePage";
import { LessonPage } from "./learn/LessonPage";
import { ReadLessonPage } from "./learn/ReadLessonPage";
import { ReviewPage } from "./learn/ReviewPage";
import { AnalyticsConsentBanner } from "./components/AnalyticsConsentBanner";

export default function App() {
  return (
    <>
      <ThemeToggle />
      <AnalyticsConsentBanner />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/guide" element={<Navigate to="/help" replace />} />
        <Route path="/help" element={<HelpIndexPage />} />
        <Route path="/help/getting-started" element={<GettingStartedPage />} />
        <Route path="/help/writing-decks" element={<WritingDecksPage />} />
        <Route path="/help/advanced-cards" element={<AdvancedCardsPage />} />
        <Route path="/help/branching-decks" element={<BranchingDecksPage />} />
        <Route path="/help/studying" element={<StudyingPage />} />
        <Route path="/help/ai" element={<AiPage />} />
        <Route path="/help/sharing" element={<SharingPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/d/:slug" element={<PublicDeckPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/decks/new" element={<CreateDeckPage />} />
          <Route path="/decks/:id/study" element={<StudyPage />} />
          <Route path="/decks/:id/cards" element={<ManageDeckCardsPage />} />
          <Route path="/decks/:id/cards/:cardId" element={<EditCardPage />} />
          <Route
            path="/decks/:id/senses/:word/reorder"
            element={<SenseReorderPage />}
          />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/courses" element={<MyCoursesPage />} />
          <Route path="/courses/decks" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/library/courses" element={<PublicCoursesPage />} />
          <Route path="/app-decks" element={<AppDecksPage />} />
          <Route path="/app-decks/:id" element={<AppDecksCollectionPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:subjectId" element={<OutlinePage />} />
          <Route
            path="/learn/:subjectId/lessons/:slug"
            element={<LessonPage />}
          />
          <Route
            path="/learn/:subjectId/lessons/:slug/read"
            element={<ReadLessonPage />}
          />
          <Route path="/learn/:subjectId/reviews" element={<ReviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
