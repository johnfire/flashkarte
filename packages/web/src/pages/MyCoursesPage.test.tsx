import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { MyCoursesPage } from "./MyCoursesPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    courses: { list: vi.fn() },
    learn: { subjects: vi.fn() },
  },
}));

const courseApi = api.courses as unknown as { list: ReturnType<typeof vi.fn> };
const learnApi = api.learn as unknown as { subjects: ReturnType<typeof vi.fn> };

describe("MyCoursesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseApi.list.mockResolvedValue([
      {
        id: "deck-course",
        title: "Deck route",
        description: null,
        decks_total: 2,
        decks_mastered: 1,
        is_public: false,
      },
    ]);
    learnApi.subjects.mockResolvedValue([
      {
        id: "lesson-course",
        title: "Lesson route",
        description: "Read then practise",
        concept_count: 8,
      },
    ]);
  });

  test("groups both course types with clear labels", async () => {
    render(
      <MemoryRouter>
        <MyCoursesPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Lesson route")).toBeInTheDocument();
    expect(screen.getByText("Deck route")).toBeInTheDocument();
    expect(screen.getByText("Lesson course")).toBeInTheDocument();
    expect(screen.getByText("Deck Courses")).toBeInTheDocument();
  });
});
