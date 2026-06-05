import { Link } from "react-router-dom";

export function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl rounded-xl bg-white px-6 py-8 shadow sm:px-10 dark:bg-gray-800">
        <Link to="/login" className="text-sm text-indigo-600">
          ← Back
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Impressum</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Angaben gemäß § 5 DDG
        </p>

        <div className="mt-6 space-y-6 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Diensteanbieter
            </h2>
            <p className="mt-2">
              Christopher Rehm
              <br />
              Alpenstr. 3<br />
              86836 Klosterlechfeld
              <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Kontakt
            </h2>
            <p className="mt-2">
              Telefon:{" "}
              <a className="text-indigo-600" href="tel:+4982060154">
                +49 8206 0154
              </a>
              <br />
              E-Mail:{" "}
              <a className="text-indigo-600" href="mailto:car2187bus@pm.me">
                car2187bus@pm.me
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p className="mt-2">Christopher Rehm, Anschrift wie oben.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Streitschlichtung
            </h2>
            <p className="mt-2">
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{" "}
              <a
                className="text-indigo-600"
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Wir sind nicht bereit oder verpflichtet, an
              Streitbeilegungsverfahren vor einer Verbraucher­schlichtungsstelle
              teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
