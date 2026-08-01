import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { LibraryPage } from "./LibraryPage";

vi.mock("../api/client", () => ({
  api: {
    library: { list: vi.fn(), clone: vi.fn() },
  },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
}));

const mockedLibraryApi = api.library as unknown as {
  list: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/library"]}>
      <Routes>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/decks/:id/study" element={<p>Study destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders loading, loaded, and searched decks", async () => {
    mockedLibraryApi.list
      .mockResolvedValueOnce({
        decks: [
          {
            id: "deck-1",
            title: "World capitals",
            author: "Ada",
            cardCount: 10,
            publishedAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({ decks: [] });
    renderPage();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("World capitals")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox"), " geography ");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByText("No public decks found."),
    ).toBeInTheDocument();
    expect(mockedLibraryApi.list).toHaveBeenLastCalledWith("geography");
  });

  test("renders API load failures", async () => {
    mockedLibraryApi.list.mockRejectedValue(
      new ApiError(500, "FAILED", "Library unavailable"),
    );
    renderPage();

    expect(await screen.findByText("Library unavailable")).toBeInTheDocument();
  });

  test("navigates to the cloned deck", async () => {
    mockedLibraryApi.list.mockResolvedValue({
      decks: [
        {
          id: "deck-1",
          title: "World capitals",
          author: "Ada",
          cardCount: 10,
          publishedAt: null,
        },
      ],
    });
    mockedLibraryApi.clone.mockResolvedValue({ id: "owned-deck" });
    renderPage();
    await screen.findByText("World capitals");

    await userEvent.click(screen.getByRole("button", { name: "Clone" }));
    expect(await screen.findByText("Study destination")).toBeInTheDocument();
    expect(mockedLibraryApi.clone).toHaveBeenCalledWith("deck-1");
  });
});
