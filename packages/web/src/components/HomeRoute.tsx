import { useAuth } from "../auth/AuthContext";
import { LandingPage } from "../pages/LandingPage";
import { DeckListPage } from "../pages/DeckListPage";

// "/" shows the marketing landing page to logged-out visitors (the public,
// indexable entry point) and the user's decks once authenticated.
export function HomeRoute() {
  const { authed, loading } = useAuth();
  if (loading) return null;
  return authed ? <DeckListPage /> : <LandingPage />;
}
