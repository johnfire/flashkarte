import { useAuth } from "../auth/AuthContext";
import { LandingPage } from "../pages/LandingPage";
import { DeckListPage } from "../pages/DeckListPage";
import { VerifyBanner } from "./VerifyBanner";

// "/" shows the marketing landing page to logged-out visitors (the public,
// indexable entry point) and the user's decks once authenticated.
//
// The deck list is reached here rather than through ProtectedRoute, so this
// branch has to render VerifyBanner itself — without it the page a user lands
// on right after signup is the one place with no way to resend the
// verification email.
export function HomeRoute() {
  const { authed, loading } = useAuth();
  if (loading) return null;
  if (!authed) return <LandingPage />;
  return (
    <>
      <VerifyBanner />
      <DeckListPage />
    </>
  );
}
