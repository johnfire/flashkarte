import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import "../i18n";
import { LibraryHubPage } from "./LibraryHubPage";

describe("LibraryHubPage", () => {
  test("offers official and community sources for courses and decks", () => {
    render(
      <MemoryRouter>
        <LibraryHubPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Official Courses/ }),
    ).toHaveAttribute("href", "/library/courses/official");
    expect(
      screen.getByRole("link", { name: /Community Courses/ }),
    ).toHaveAttribute("href", "/library/courses/community");
    expect(
      screen.getByRole("link", { name: /Official Flashcard Decks/ }),
    ).toHaveAttribute("href", "/library/official/decks");
    expect(
      screen.getByRole("link", { name: /Community Flashcard Decks/ }),
    ).toHaveAttribute("href", "/library/community/decks");
    expect(screen.getByRole("link", { name: "My Courses" })).toHaveAttribute(
      "href",
      "/learn",
    );
  });
});
