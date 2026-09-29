import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { CourseCollectionPage } from "./CourseCollectionPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    contentLanguages: {
      list: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue({}),
    },
    learn: {
      subjects: vi.fn(),
    },
  },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "owner-1", emailVerifiedAt: "2026-01-01T00:00:00Z" },
  }),
}));

const subjects = api.learn.subjects as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

function renderCollectionPage(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/learn/collections/:collectionId"
          element={<CourseCollectionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CourseCollectionPage", () => {
  test("loads a collection once and links each course to its outline", async () => {
    subjects.mockResolvedValue([
      {
        id: "course-1",
        user_id: "owner-1",
        title: "AI Literacy",
        description: "A practical introduction to AI.",
        is_public: true,
        is_official: true,
        concept_count: 28,
        course_collection_id: "artificial-intelligence",
        course_collection_title: "Artificial Intelligence",
      },
    ]);

    renderCollectionPage("/learn/collections/artificial-intelligence");

    const course = await screen.findByRole("link", { name: /AI Literacy/ });
    expect(subjects).toHaveBeenCalledTimes(1);
    expect(course).toHaveAttribute("href", "/learn/course-1");
    expect(
      screen.getByRole("heading", { name: "Artificial Intelligence" }),
    ).toBeInTheDocument();
  });

  test("only shows courses matching the selected language", async () => {
    subjects.mockResolvedValue([
      {
        id: "course-en",
        user_id: "owner-1",
        title: "The Art of Electronics (EN)",
        locale: "en",
        description: null,
        is_public: true,
        is_official: true,
        concept_count: 10,
        course_collection_id: "art-of-electronics",
        course_collection_title: "The Art of Electronics",
      },
      {
        id: "course-de",
        user_id: "owner-1",
        title: "The Art of Electronics (DE)",
        locale: "de",
        description: null,
        is_public: true,
        is_official: true,
        concept_count: 10,
        course_collection_id: "art-of-electronics",
        course_collection_title: "The Art of Electronics",
      },
    ]);

    renderCollectionPage("/learn/collections/art-of-electronics?language=en");

    expect(
      await screen.findByRole("link", {
        name: /The Art of Electronics \(EN\)/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /The Art of Electronics \(DE\)/ }),
    ).not.toBeInTheDocument();
  });
});
