import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { DeckListPage } from "./pages/DeckListPage";
import { CreateDeckPage } from "./pages/CreateDeckPage";
import { StudyPage } from "./pages/StudyPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DeckListPage />} />
        <Route path="/decks/new" element={<CreateDeckPage />} />
        <Route path="/decks/:id/study" element={<StudyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
