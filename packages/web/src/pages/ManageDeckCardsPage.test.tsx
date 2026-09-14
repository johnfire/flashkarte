import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { ManageDeckCardsPage } from "./ManageDeckCardsPage";
import { api } from "../api/client";
import "../i18n";

vi.mock("../api/client", () => ({
  api: { decks: { get: vi.fn() } },
  ApiError: class ApiError extends Error {},
}));

const mockApi = api as unknown as {
  decks: { get: ReturnType<typeof vi.fn> };
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/decks/d1/cards"]}>
      <Routes>
        <Route path="/decks/:id/cards" element={<ManageDeckCardsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManageDeckCardsPage", () => {
  test("lists every card's front text, category, and a type badge", async () => {
    mockApi.decks.get.mockResolvedValue({
      id: "d1",
      title: "My Deck",
      cards: [
        {
          id: "c1",
          type: "basic",
          content: { front: "Plain question", back: "Answer" },
          category: "Basics",
          position: 0,
        },
        {
          id: "c2",
          type: "branch",
          content: {
            prompt: "Branch node",
            options: [{ text: "Go", goto: "end" }],
          },
          category: null,
          position: 1,
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Plain question")).toBeTruthy();
    expect(screen.getByText("Basics")).toBeTruthy();
    // Branch card's display text comes from `prompt`, not `front`.
    expect(screen.getByText("Branch node")).toBeTruthy();
    expect(screen.getByText("Branch")).toBeTruthy();
  });

  test("shows an empty-state message for a deck with no cards", async () => {
    mockApi.decks.get.mockResolvedValue({
      id: "d1",
      title: "Empty Deck",
      cards: [],
    });
    renderPage();
    expect(await screen.findByText("This deck has no cards yet.")).toBeTruthy();
  });
});
