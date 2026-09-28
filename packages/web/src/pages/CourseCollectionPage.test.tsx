import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { CourseCollectionPage } from "./CourseCollectionPage";

vi.mock("../api/client", () => ({
  api: {
    contentLanguages: {
      list: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue({}),
    },
    courseCollections: { get: vi.fn(), enrollAll: vi.fn() },
    learn: { enroll: vi.fn() },
  },
  ApiError: class ApiError extends Error {},
  reportClientError: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "collection-learner", emailVerifiedAt: "2026-01-01T00:00:00Z" },
  }),
}));

const courseCollectionsApi = api.courseCollections as unknown as {
  get: ReturnType<typeof vi.fn>;
  enrollAll: ReturnType<typeof vi.fn>;
};

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/library/courses/community/collections/collection-1"]}
    >
      <Routes>
        <Route
          path="/library/courses/:source/collections/:id"
          element={<CourseCollectionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CourseCollectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseCollectionsApi.get.mockResolvedValue({
      id: "collection-1",
      title: "Art of Electronics",
      description: "A chapter-by-chapter learning path.",
      courses: [
        {
          id: "course-1",
          title: "Chapter 1",
          description: null,
          concept_count: 4,
        },
      ],
    });
    courseCollectionsApi.enrollAll.mockResolvedValue({ enrolled: 1 });
  });

  test("adds every community course from the collection", async () => {
    renderPage();

    await screen.findByText("Art of Electronics");
    await userEvent.click(
      screen.getByRole("button", { name: "Add all courses" }),
    );

    expect(courseCollectionsApi.enrollAll).toHaveBeenCalledWith(
      "collection-1",
      "community",
    );
    expect(
      screen.getByRole("button", { name: "Added all courses" }),
    ).toBeDisabled();
  });
});
