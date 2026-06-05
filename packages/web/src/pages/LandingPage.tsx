import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "Markdown decks",
    body: "Write cards in plain Markdown — paste, import a file, or generate them. No clunky editors.",
  },
  {
    title: "Spaced repetition",
    body: "A proven SM-2 schedule shows you each card right before you'd forget it, so reviews stay short.",
  },
  {
    title: "Study anywhere",
    body: "Web and Android, in sync. Pick up your reviews on the bus and finish them at your desk.",
  },
  {
    title: "Bring your own AI",
    body: "Connect your own AI assistant over MCP to turn notes into decks — no extra subscription.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg">
            fk
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
            Learn anything, faster.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            flashkarte turns Markdown into spaced-repetition flashcards that
            stick. Simple to write, smart about when you review.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?mode=signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get started — it's free
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800/60"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:underline"
          >
            Start studying →
          </Link>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            <Link
              to="/privacy"
              className="hover:text-gray-600 dark:hover:text-gray-300"
            >
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
