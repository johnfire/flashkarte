import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white dark:bg-gray-800 px-6 py-8 shadow sm:px-10">
        <Link to="/login" className="text-sm text-indigo-600">
          ← Back
        </Link>

        <h1 className="mt-4 text-2xl font-bold">flashkarte — Privacy Policy</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Last updated: 5 June 2026</p>

        <div className="prose prose-sm mt-6 max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p>
            flashkarte is a Markdown-based flashcard app with spaced-repetition
            study, operated by Christopher Rehm (Germany). This policy explains
            what data the app collects, why, and your choices. Questions or
            requests:{" "}
            <a className="text-indigo-600" href="mailto:car2187bus@pm.me">
              car2187bus@pm.me
            </a>
            .
          </p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              What we collect
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Account details</strong> — your email address and a
                password. The password is never stored in plain text; only a
                salted hash is kept.
              </li>
              <li>
                <strong>Your content</strong> — the flashcard decks and cards
                you create or import, and your study progress (review history
                and scheduling).
              </li>
              <li>
                <strong>API keys</strong> — if you generate a key to connect an
                AI client via the MCP server, we store a hashed form of that key
                (shown to you in full only once).
              </li>
              <li>
                <strong>Diagnostic reports</strong> — when the app hits an error
                it may send a report (error message, technical stack trace, app
                version, and platform) to our server log so we can fix bugs.
                These reports are used only for debugging.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              What we do not do
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                No advertising, no ad networks, and no third-party analytics or
                tracking.
              </li>
              <li>We do not sell or rent your personal data to anyone.</li>
              <li>We do not use your decks or content to train any model.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI / MCP connections
            </h2>
            <p className="mt-2">
              flashkarte lets you connect your own AI assistant (for example via
              Claude) through a hosted MCP server, using a personal API key, so
              the AI can create decks in your account. When you use that,
              requests are processed by <em>your own</em> AI provider under
              their terms and privacy policy — the AI computation does not run
              on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              How your data is stored and protected
            </h2>
            <p className="mt-2">
              Data is stored in a PostgreSQL database on a private server in the
              EU. All traffic to the service is encrypted with HTTPS (TLS).
              Passwords are hashed, and API keys are stored hashed. Backups of
              the database are kept on a rolling schedule and then deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Retention and deletion
            </h2>
            <p className="mt-2">
              We keep your account data for as long as your account exists. You
              can delete individual decks at any time in the app. To delete your
              entire account and associated data, email{" "}
              <a className="text-indigo-600" href="mailto:car2187bus@pm.me">
                car2187bus@pm.me
              </a>{" "}
              from your account email address and we will remove it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Children</h2>
            <p className="mt-2">
              flashkarte is not directed at children under 13, and we do not
              knowingly collect data from them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your rights</h2>
            <p className="mt-2">
              Depending on where you live (for example under the EU GDPR), you
              may have the right to access, correct, export, or delete your
              personal data. Contact us at the address above to exercise these
              rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Changes</h2>
            <p className="mt-2">
              If this policy changes, we will update the date at the top of this
              page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
