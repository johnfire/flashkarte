import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import "../../i18n";
import { HelpIndexPage } from "./HelpIndexPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <HelpIndexPage />
    </MemoryRouter>,
  );
}

describe("HelpIndexPage", () => {
  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Help" }),
    ).toBeInTheDocument();
  });

  it("links to every help topic", () => {
    renderPage();
    for (const [path, name] of [
      ["/help/getting-started", "Getting started"],
      ["/help/writing-decks", "Writing decks"],
      ["/help/branching-decks", "Branching decks"],
      ["/help/studying", "Studying & spaced repetition"],
      ["/help/ai", "Creating decks with AI"],
      ["/help/sharing", "Sharing & exploring"],
    ] as const) {
      const link = screen.getByRole("link", { name: new RegExp(name) });
      expect(link).toHaveAttribute("href", path);
    }
  });
});
