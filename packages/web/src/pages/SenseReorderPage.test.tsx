import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { SenseReorderPage } from "./SenseReorderPage";
import { api } from "../api/client";
import "../i18n";

vi.mock("../api/client", () => ({
  api: { decks: { get: vi.fn(), reorderSenses: vi.fn() } },
  ApiError: class ApiError extends Error {},
  reportClientError: vi.fn(),
}));

const mockApi = api as unknown as {
  decks: {
    get: ReturnType<typeof vi.fn>;
    reorderSenses: ReturnType<typeof vi.fn>;
  };
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/decks/d1/senses/der%20Zug/reorder"]}>
      <Routes>
        <Route
          path="/decks/:id/senses/:word/reorder"
          element={<SenseReorderPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const DECK = {
  id: "d1",
  title: "My Deck",
  cards: [
    {
      id: "c1",
      type: "basic",
      content: {
        front: "der Zug",
        back: "train",
        sense: {
          word: "der Zug",
          index: 0,
          count: 2,
          context: "first meaning",
          hint: "",
        },
      },
      category: null,
      position: 0,
    },
    {
      id: "c2",
      type: "basic",
      content: {
        front: "der Zug",
        back: "draft (chess)",
        sense: {
          word: "der Zug",
          index: 1,
          count: 2,
          context: "second meaning",
          hint: "",
        },
      },
      category: null,
      position: 1,
    },
  ],
};

describe("SenseReorderPage", () => {
  test("lists the word's meanings in chain order", async () => {
    mockApi.decks.get.mockResolvedValue(DECK);
    renderPage();

    await screen.findByText('Reorder meanings of "der Zug"');
    const items = await screen.findAllByText(/^\d\. /);
    expect(items.map((el) => el.textContent)).toEqual([
      "1. first meaning",
      "2. second meaning",
    ]);
  });

  test("moving a meaning down and saving submits the new order", async () => {
    mockApi.decks.get.mockResolvedValue(DECK);
    mockApi.decks.reorderSenses.mockResolvedValue({
      deck_id: "d1",
      word: "der Zug",
      order: ["c2", "c1"],
    });
    renderPage();

    await screen.findByText('Reorder meanings of "der Zug"');
    await screen.findAllByText(/^\d\. /);
    // Both rows have a "Move down" button; the first row's is the only enabled one.
    fireEvent.click(screen.getAllByLabelText("Move down")[0]);

    const items = screen.getAllByText(/^\d\. /);
    expect(items.map((el) => el.textContent)).toEqual([
      "1. second meaning",
      "2. first meaning",
    ]);

    fireEvent.click(screen.getByText("Save order"));

    await waitFor(() => {
      expect(mockApi.decks.reorderSenses).toHaveBeenCalledWith(
        "d1",
        "der Zug",
        ["c2", "c1"],
      );
    });
    await screen.findByText("Order saved.");
  });
});
