import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { CourseDetail, DeckWithCounts } from "../api/types";
import "../i18n";
import { CourseDetailPage } from "./CourseDetailPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    courses: {
      get: vi.fn(),
      addDeck: vi.fn(),
      removeDeck: vi.fn(),
      setPublic: vi.fn(),
      remove: vi.fn(),
    },
    decks: { list: vi.fn() },
  },
  reportClientError: vi.fn(),
}));

const mockedCourses = api.courses as unknown as {
  get: ReturnType<typeof vi.fn>;
  addDeck: ReturnType<typeof vi.fn>;
  removeDeck: ReturnType<typeof vi.fn>;
  setPublic: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};
const mockedDecks = api.decks as unknown as { list: ReturnType<typeof vi.fn> };

const course: CourseDetail = {
  id: "c1",
  user_id: "u1",
  title: "Circuits 101",
  description: "The basics",
  is_public: false,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  decks: [
    {
      deck_id: "d1",
      position: 0,
      title: "Voltage & Current",
      card_count: 10,
      mastered_count: 10,
      mastered: true,
      locked: false,
    },
    {
      deck_id: "d2",
      position: 1,
      title: "Capacitors",
      card_count: 8,
      mastered_count: 2,
      mastered: false,
      locked: true,
    },
  ],
};

const ownDeck: DeckWithCounts = {
  id: "d3",
  title: "Diodes",
  source_filename: null,
  created_at: "x",
  updated_at: "x",
  card_count: 5,
  due_count: 5,
  is_public: false,
  is_official: false,
  viewed_count: 0,
  new_count: 5,
  again_count: 0,
  hard_count: 0,
  good_count: 0,
  easy_count: 0,
} as DeckWithCounts;

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/courses/c1"]}>
      <Routes>
        <Route path="/courses/:id" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CourseDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCourses.get.mockResolvedValue(course);
    mockedDecks.list.mockResolvedValue([ownDeck]);
  });

  test("shows unlocked and locked decks", async () => {
    renderPage();
    expect(await screen.findByText(/Voltage & Current/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Study" })).toHaveAttribute(
      "href",
      "/decks/d1/study",
    );
    expect(screen.getByText("Locked")).toBeInTheDocument();
    // The locked deck has no Study link, only the unlocked one does.
    expect(screen.getAllByRole("link", { name: "Study" })).toHaveLength(1);
  });

  test("adds an existing deck to the course", async () => {
    mockedCourses.addDeck.mockResolvedValue({
      course_id: "c1",
      deck_id: "d3",
    });
    mockedCourses.get.mockResolvedValueOnce(course).mockResolvedValueOnce({
      ...course,
      decks: [
        ...course.decks,
        {
          deck_id: "d3",
          position: 2,
          title: "Diodes",
          card_count: 5,
          mastered_count: 0,
          mastered: false,
          locked: true,
        },
      ],
    });
    renderPage();
    await screen.findByText(/Voltage & Current/);

    await userEvent.selectOptions(screen.getByRole("combobox"), "d3");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockedCourses.addDeck).toHaveBeenCalledWith("c1", "d3"),
    );
  });

  test("removes a deck after confirmation", async () => {
    vi.stubGlobal("confirm", () => true);
    mockedCourses.removeDeck.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText(/Voltage & Current/);

    const [removeButton] = screen.getAllByRole("button", { name: "Remove" });
    await userEvent.click(removeButton);

    await waitFor(() =>
      expect(mockedCourses.removeDeck).toHaveBeenCalledWith("c1", "d1"),
    );
    vi.unstubAllGlobals();
  });

  test("toggles publish state optimistically, reverting on failure", async () => {
    mockedCourses.setPublic.mockRejectedValue(new Error("nope"));
    vi.stubGlobal("alert", vi.fn());
    renderPage();
    await screen.findByText(/Voltage & Current/);

    await userEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Publish" }),
      ).toBeInTheDocument(),
    );
    vi.unstubAllGlobals();
  });
});
