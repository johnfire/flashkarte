import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { EditCardPage } from "./EditCardPage";
import { api } from "../api/client";
import "../i18n";

vi.mock("../api/client", () => ({
  api: { decks: { get: vi.fn(), updateCard: vi.fn() } },
  ApiError: class ApiError extends Error {},
  reportClientError: vi.fn(),
}));

const mockApi = api as unknown as {
  decks: {
    get: ReturnType<typeof vi.fn>;
    updateCard: ReturnType<typeof vi.fn>;
  };
};

function renderPage(cardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/decks/d1/cards/${cardId}`]}>
      <Routes>
        <Route path="/decks/:id/cards/:cardId" element={<EditCardPage />} />
        <Route path="/decks/:id/cards" element={<div>Card list page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EditCardPage", () => {
  test("edits a basic card's front/back/category and saves the patch", async () => {
    mockApi.decks.get.mockResolvedValue({
      id: "d1",
      title: "My Deck",
      cards: [
        {
          id: "c1",
          type: "basic",
          content: { front: "Old front", back: "Old back" },
          category: "Basics",
          position: 0,
        },
      ],
    });
    mockApi.decks.updateCard.mockResolvedValue({});

    renderPage("c1");

    await screen.findByText("Edit card #1");
    const frontField = screen.getByDisplayValue("Old front");
    fireEvent.change(frontField, { target: { value: "New front" } });
    const backField = screen.getByDisplayValue("Old back");
    fireEvent.change(backField, { target: { value: "New back" } });
    const categoryField = screen.getByDisplayValue("Basics");
    fireEvent.change(categoryField, { target: { value: "Advanced" } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockApi.decks.updateCard).toHaveBeenCalledWith("d1", "c1", {
        front: "New front",
        back: "New back",
        category: "Advanced",
      });
    });
    await screen.findByText("Card list page");
  });

  test("edits a branch card's options without showing back/category fields", async () => {
    mockApi.decks.get.mockResolvedValue({
      id: "d1",
      title: "My Deck",
      cards: [
        {
          id: "c1",
          type: "branch",
          content: {
            prompt: "Pick a path",
            label: "start",
            options: [{ text: "Go left", goto: "end" }],
          },
          category: null,
          position: 0,
        },
      ],
    });
    mockApi.decks.updateCard.mockResolvedValue({});

    renderPage("c1");

    await screen.findByText("Edit card #1");
    expect(screen.getByDisplayValue("Pick a path")).toBeTruthy();
    expect(screen.queryByText("Back")).toBeNull();
    expect(screen.queryByText("Category")).toBeNull();

    const optionTextField = screen.getByDisplayValue("Go left");
    fireEvent.change(optionTextField, { target: { value: "Go right" } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockApi.decks.updateCard).toHaveBeenCalledWith("d1", "c1", {
        front: "Pick a path",
        options: [{ text: "Go right", goto: "end" }],
      });
    });
  });

  test("shows the chain position and a reorder link for a sense card", async () => {
    mockApi.decks.get.mockResolvedValue({
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
              context: "",
              hint: "",
            },
          },
          category: null,
          position: 0,
        },
      ],
    });

    renderPage("c1");

    await screen.findByText("Edit card #1");
    expect(screen.getByText("Meaning 1 of 2")).toBeTruthy();
    expect(screen.getByText("Reorder this word's meanings")).toBeTruthy();
    // Sense cards don't get a freeform category field.
    expect(screen.queryByText("Category")).toBeNull();
  });
});
