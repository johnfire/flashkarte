import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import "../i18n";
import { CreateDeckPage } from "./CreateDeckPage";

vi.mock("../api/client", () => ({
  api: { decks: { create: vi.fn(), createFromFile: vi.fn() } },
  ApiError: class ApiError extends Error {},
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateDeckPage />
    </MemoryRouter>,
  );
}

describe("CreateDeckPage", () => {
  test("live preview counts cards from pasted markdown", async () => {
    renderPage();
    const textarea = screen.getByRole("textbox");
    await userEvent.type(
      textarea,
      "# Deck{enter}{enter}**1. Q1**{enter}A1{enter}{enter}**2. Q2**{enter}A2",
    );
    expect(await screen.findByText(/2 cards/)).toBeInTheDocument();
  });

  test("save is disabled when markdown yields zero cards", async () => {
    renderPage();
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "# Deck with no card markers");
    expect(screen.getByText(/No cards detected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save deck/ })).toBeDisabled();
  });
});
