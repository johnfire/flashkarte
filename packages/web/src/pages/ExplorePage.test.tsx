import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import "../i18n";
import { ExplorePage } from "./ExplorePage";

vi.mock("../api/client", () => ({
  api: { publicLibrary: { list: vi.fn() } },
  ApiError: class ApiError extends Error {
    constructor(_status: number, _code: string, message: string) {
      super(message);
    }
  },
}));

const mockedPublicLibrary = api.publicLibrary as unknown as {
  list: ReturnType<typeof vi.fn>;
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ExplorePage />
    </MemoryRouter>,
  );
}

describe("ExplorePage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("renders loading, loaded, and searched decks", async () => {
    mockedPublicLibrary.list
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
    expect(mockedPublicLibrary.list).toHaveBeenLastCalledWith("geography");
  });

  test("renders API load failures", async () => {
    mockedPublicLibrary.list.mockRejectedValue(
      new ApiError(500, "FAILED", "Explore unavailable"),
    );
    renderPage();

    expect(await screen.findByText("Explore unavailable")).toBeInTheDocument();
  });
});
