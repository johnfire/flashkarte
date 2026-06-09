import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { CreateDeckPage } from "./pages/CreateDeckPage";
import { StudyPage } from "./pages/StudyPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ImpressumPage } from "./pages/ImpressumPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { HomeRoute } from "./components/HomeRoute";
import { LibraryPage } from "./pages/LibraryPage";
import { ExplorePage } from "./pages/ExplorePage";
import { PublicDeckPage } from "./pages/PublicDeckPage";

export default function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/welcome" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/impressum" element={<ImpressumPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/d/:slug" element={<PublicDeckPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/decks/new" element={<CreateDeckPage />} />
          <Route path="/decks/:id/study" element={<StudyPage />} />
          <Route path="/library" element={<LibraryPage />} />
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
