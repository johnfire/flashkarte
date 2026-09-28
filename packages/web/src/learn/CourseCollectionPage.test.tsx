import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { CourseCollectionPage } from "./CourseCollectionPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    learn: {
      subjects: vi.fn(),
    },
  },
}));

const subjects = api.learn.subjects as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

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

    render(
      <MemoryRouter
        initialEntries={["/learn/collections/artificial-intelligence"]}
      >
        <Routes>
          <Route
            path="/learn/collections/:collectionId"
            element={<CourseCollectionPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const course = await screen.findByRole("link", { name: /AI Literacy/ });
    expect(subjects).toHaveBeenCalledTimes(1);
    expect(course).toHaveAttribute("href", "/learn/course-1");
    expect(
      screen.getByRole("heading", { name: "Artificial Intelligence" }),
    ).toBeInTheDocument();
  });
});
