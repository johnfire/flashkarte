import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LandingCourseFloaters } from "./LandingCourseFloaters";

describe("LandingCourseFloaters", () => {
  test("shows course, lesson, and progress prompts", () => {
    render(<LandingCourseFloaters />);

    expect(screen.getByText("French A1")).toBeInTheDocument();
    expect(
      screen.getByText("Lesson 3 · Asking directions"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 of 8 complete")).toBeInTheDocument();
    expect(screen.getByText("What do you do first?")).toBeInTheDocument();
  });
});
