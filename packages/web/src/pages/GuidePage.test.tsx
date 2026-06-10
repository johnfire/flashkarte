import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import "../i18n";
import { GuidePage } from "./GuidePage";

function renderPage() {
  return render(
    <MemoryRouter>
      <GuidePage />
    </MemoryRouter>,
  );
}

describe("GuidePage", () => {
  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /how to use flashkarte/i }),
    ).toBeInTheDocument();
  });

  it("renders all major section headings", () => {
    renderPage();
    for (const name of [
      /getting started/i,
      /creating a deck/i,
      /deck format/i,
      /branching decks/i,
      /deck settings/i,
      /studying/i,
      /connect an ai assistant/i,
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }
  });

  it("renders a table of contents that links to sections", () => {
    renderPage();
    const toc = screen.getByRole("navigation", { name: /on this page/i });
    expect(toc.querySelector('a[href="#format"]')).not.toBeNull();
    expect(toc.querySelector('a[href="#branching"]')).not.toBeNull();
  });

  it("shows literal Markdown examples", () => {
    renderPage();
    expect(screen.getByText(/# Spanish Basics/)).toBeInTheDocument();
    expect(
      screen.getByText(/Go left toward the cave -> cave/),
    ).toBeInTheDocument();
  });
});
