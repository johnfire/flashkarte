import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect } from "vitest";
import "../../i18n";
import { GettingStartedPage } from "./GettingStartedPage";
import { WritingDecksPage } from "./WritingDecksPage";
import { AdvancedCardsPage } from "./AdvancedCardsPage";
import { BranchingDecksPage } from "./BranchingDecksPage";
import { StudyingPage } from "./StudyingPage";
import { ContentImportGuidePage } from "./ContentImportGuidePage";
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

  it("WritingDecksPage shows the Markdown format example and links onward", () => {
    renderPage(<WritingDecksPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Writing decks" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/# Spanish Basics/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Next: Multiple choice, mix-ups/ }),
    ).toHaveAttribute("href", "/help/advanced-cards");
  });

  it("AdvancedCardsPage explains diagnostic cards and multi-sense words", () => {
    renderPage(<AdvancedCardsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Advanced card types" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/-> confusion-mitosis/)).toBeInTheDocument();
    expect(screen.getByText(/Eisenbahn/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Next: Branching decks/ }),
    ).toHaveAttribute("href", "/help/branching-decks");
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
    expect(screen.getByText(/comes back in 12 hours/)).toBeInTheDocument();
    expect(
      screen.getByText(/always add up to the Viewed count/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Next: Create learning content from a spreadsheet/,
      }),
    ).toHaveAttribute("href", "/help/importing-content");
  });

  it("ContentImportGuidePage explains both spreadsheet formats", () => {
    renderPage(<ContentImportGuidePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Create learning content from a spreadsheet",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open New deck →" }),
    ).toHaveAttribute("href", "/decks/new");
    expect(
      screen.getByRole("link", { name: "Open deck collection import →" }),
    ).toHaveAttribute("href", "/courses/import");
    expect(
      screen.getByRole("link", {
        name: "Download the flashcard-deck CSV starter",
      }),
    ).toHaveAttribute("href", "/templates/flashcard-deck.csv");
    expect(
      screen.getByRole("link", { name: "Course CSV starter" }),
    ).toHaveAttribute("href", "/templates/flashcard-course.csv");
  });

  it("AiPage points AI agents at /llms.txt", () => {
    renderPage(<AiPage />);
    expect(screen.getByRole("link", { name: "/llms.txt" })).toHaveAttribute(
      "href",
      "/llms.txt",
    );
  });

  it("AiPage links to Settings", () => {
    renderPage(<AiPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Creating learning content with AI",
      }),
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
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Structured learning courses",
      }),
    ).toBeInTheDocument();
  });
});
