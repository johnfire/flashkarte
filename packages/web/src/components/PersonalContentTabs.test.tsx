import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import "../i18n";
import { PersonalContentTabs } from "./PersonalContentTabs";

describe("PersonalContentTabs", () => {
  test("links to a learner's decks and structured courses", () => {
    render(
      <MemoryRouter initialEntries={["/learn"]}>
        <PersonalContentTabs />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation")).toHaveAccessibleName(
      "My content navigation",
    );
    expect(screen.getByRole("link", { name: "My Decks" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "My Courses" })).toHaveAttribute(
      "href",
      "/learn",
    );
    expect(screen.getByRole("link", { name: "My Courses" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
