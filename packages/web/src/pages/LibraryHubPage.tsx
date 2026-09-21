import { Link } from "react-router";

const librarySections = [
  {
    title: "Official Courses",
    detail: "Courses maintained by the app.",
    to: "/library/courses/official",
  },
  {
    title: "Official Flashcard Decks",
    detail: "Flashcard decks maintained by the app.",
    to: "/library/official/decks",
  },
  {
    title: "Community Courses",
    detail: "Courses published by other learners.",
    to: "/library/courses/community",
  },
  {
    title: "Community Flashcard Decks",
    detail: "Decks published by other learners.",
    to: "/library/community/decks",
  },
];

export function LibraryHubPage() {
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex justify-between">
        <h1 className="text-3xl font-bold">Library</h1>
        <Link to="/" className="text-sm text-indigo-600">
          My Flashcard Decks
        </Link>
      </header>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {librarySections.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              className="block rounded-lg border p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {section.detail}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
