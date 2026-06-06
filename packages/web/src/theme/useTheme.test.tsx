import { describe, test, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "./useTheme";

// Two independent consumers of useTheme, like the floating ThemeToggle and the
// Settings page rendered at the same time.
function Toggle() {
  const { toggle } = useTheme();
  return <button onClick={toggle}>toggle</button>;
}
function Indicator() {
  const { theme } = useTheme();
  return <span data-testid="indicator">{theme}</span>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("useTheme shared state", () => {
  test("a change from one consumer is reflected in another", async () => {
    render(
      <>
        <Toggle />
        <Indicator />
      </>,
    );
    expect(screen.getByTestId("indicator").textContent).toBe("light");

    await userEvent.click(screen.getByText("toggle"));

    // The other consumer must reflect the new theme, not a stale copy.
    expect(screen.getByTestId("indicator").textContent).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
