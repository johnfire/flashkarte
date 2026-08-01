import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect } from "vitest";
import "../../i18n";
import { GettingStartedPage } from "./GettingStartedPage";
import { WritingDecksPage } from "./WritingDecksPage";
import { BranchingDecksPage } from "./BranchingDecksPage";
import { StudyingPage } from "./StudyingPage";
import { AiPage } from "./AiPage";
import { SharingPage } from "./SharingPage";

function renderPage(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("help topic pages", () => {
  it("GettingStartedPage renders its heading and links to the next topic", () => {
    renderPage(<GettingStartedPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Getting started" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Next: Writing decks/ }),
    ).toHaveAttribute("href", "/help/writing-decks");
  });

  it("WritingDecksPage shows the Markdown format example", () => {
    renderPage(<WritingDecksPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Writing decks" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/# Spanish Basics/)).toBeInTheDocument();
  });

  it("BranchingDecksPage shows the branching example", () => {
    renderPage(<BranchingDecksPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Branching decks" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Go left toward the cave -> cave/),
    ).toBeInTheDocument();
  });

  it("StudyingPage explains the ratings and the counter legend", () => {
    renderPage(<StudyingPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Studying & spaced repetition",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/comes back tomorrow/)).toBeInTheDocument();
    expect(
      screen.getByText(/always add up to the Viewed count/),
    ).toBeInTheDocument();
  });

  it("AiPage links to Settings", () => {
    renderPage(<AiPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Creating decks with AI" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Settings/ })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("SharingPage explains Explore vs Library", () => {
    renderPage(<SharingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Sharing & exploring" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Explore" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Library" }),
    ).toBeInTheDocument();
  });
});
