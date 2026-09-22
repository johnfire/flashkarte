import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { LibraryHubPage } from "./LibraryHubPage";

vi.mock("../api/client", () => ({
  api: {
    learn: { catalog: vi.fn(), enroll: vi.fn() },
    decks: {
      listCollections: vi.fn(),
      listOfficial: vi.fn(),
      subscribe: vi.fn(),
      subscribeAllInCollection: vi.fn(),
    },
    publicCourses: { list: vi.fn(), clone: vi.fn() },
    library: { list: vi.fn(), clone: vi.fn() },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
  reportClientError: vi.fn(),
}));

const learnApi = api.learn as unknown as {
  catalog: ReturnType<typeof vi.fn>;
  enroll: ReturnType<typeof vi.fn>;
};
const deckApi = api.decks as unknown as {
  listCollections: ReturnType<typeof vi.fn>;
  listOfficial: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  subscribeAllInCollection: ReturnType<typeof vi.fn>;
};
const publicCoursesApi = api.publicCourses as unknown as {
  list: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
};
const libraryApi = api.library as unknown as {
  list: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/library"]}>
      <Routes>
        <Route path="/library" element={<LibraryHubPage />} />
        <Route path="/decks/:id/study" element={<p>Study destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LibraryHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    learnApi.catalog.mockImplementation((source) =>
      Promise.resolve([
        {
          id: `${source}-course`,
          title: `${source} structured course`,
          description: null,
          concept_count: 3,
        },
      ]),
    );
    deckApi.listCollections.mockResolvedValue([
      {
        id: "official-collection",
        title: "Official deck collection",
        description: null,
        deck_count: 2,
      },
    ]);
    deckApi.listOfficial.mockResolvedValue([
      {
        id: "official-deck",
        title: "Official standalone deck",
        created_at: "2026-01-01",
        card_count: 20,
        subscribed: false,
        category_id: null,
      },
    ]);
    publicCoursesApi.list.mockResolvedValue([
      {
        id: "community-collection",
        user_id: "owner",
        title: "Community deck collection",
        description: null,
        is_public: true,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        decks_total: 3,
      },
    ]);
    libraryApi.list.mockResolvedValue([
      {
        id: "community-deck",
        title: "Community standalone deck",
        author: "Ada",
        cardCount: 15,
        publishedAt: null,
        categoryId: null,
      },
    ]);
  });

  test("lists every course and deck source under its Library heading", async () => {
    renderPage();

    expect(
      await screen.findByText("official structured course"),
    ).toBeInTheDocument();
    expect(screen.getByText("community structured course")).toBeInTheDocument();
    expect(screen.getByText("Official deck collection")).toBeInTheDocument();
    expect(screen.getByText("Official standalone deck")).toBeInTheDocument();
    expect(screen.getByText("Community deck collection")).toBeInTheDocument();
    expect(screen.getByText("Community standalone deck")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Official Structured Learning Courses",
      }),
    ).toHaveAttribute("href", "/library/courses/official");
    expect(
      screen.getByRole("link", {
        name: "Community Structured Learning Courses",
      }),
    ).toHaveAttribute("href", "/library/courses/community");
    expect(
      screen.getByRole("link", { name: "Official Flashcard Decks" }),
    ).toHaveAttribute("href", "/library/official/decks");
    expect(
      screen.getByRole("link", { name: "Community Flashcard Decks" }),
    ).toHaveAttribute("href", "/library/community/decks");
    expect(
      screen.getByRole("link", { name: "My Structured Learning Courses" }),
    ).toHaveAttribute("href", "/learn");
    for (const catalogList of screen.getAllByRole("list")) {
      expect(catalogList).toHaveClass("content-card-grid");
    }

    await waitFor(() =>
      expect(deckApi.listCollections).toHaveBeenCalledWith({ limit: 100 }),
    );
    expect(deckApi.listOfficial).toHaveBeenCalledWith({ limit: 100 });
    expect(publicCoursesApi.list).toHaveBeenCalledWith({ limit: 100 });
    expect(libraryApi.list).toHaveBeenCalledWith({ limit: 100 });
  });

  test("keeps the remaining Library sections visible if one catalog fails", async () => {
    learnApi.catalog.mockImplementation((source) =>
      source === "official"
        ? Promise.reject(
            new ApiError(503, "UNAVAILABLE", "Courses unavailable"),
          )
        : Promise.resolve([]),
    );
    renderPage();

    expect(await screen.findByText("Courses unavailable")).toBeInTheDocument();
    expect(screen.getByText("Official deck collection")).toBeInTheDocument();
    expect(screen.getByText("Community standalone deck")).toBeInTheDocument();
  });
});
