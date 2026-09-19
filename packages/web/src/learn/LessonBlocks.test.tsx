import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { Block } from "@flashkarte/shared";
import { LessonBlocks } from "./LessonBlocks";

const blocks: Block[] = [
  {
    type: "paragraph",
    spans: [
      { text: "A " },
      { text: "token", bold: true },
      { text: " is " },
      { text: "a piece", italic: true },
      { text: " of text, like " },
      { text: "cat", code: true },
    ],
  },
  {
    type: "list",
    ordered: true,
    items: [[{ text: "first" }], [{ text: "second" }]],
  },
  { type: "list", ordered: false, items: [[{ text: "dot" }]] },
  { type: "code", text: "tokens = split(text)" },
  { type: "callout", tone: "warning", spans: [{ text: "Careful here" }] },
  {
    type: "image",
    src: "https://example.com/tokenizer.svg",
    alt: "A diagram of a tokenizer",
    display: "inline",
    caption: "Figure 1",
  },
  { type: "formula", latex: "R = V / I", spoken: "R equals V over I" },
];

describe("LessonBlocks", () => {
  test("draws every block type natively", () => {
    const { container } = render(<LessonBlocks blocks={blocks} />);
    expect(container.querySelector("strong")?.textContent).toBe("token");
    expect(container.querySelector("em")?.textContent).toBe("a piece");
    expect(container.querySelector("p code")?.textContent).toBe("cat");
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelectorAll("ul > li")).toHaveLength(1);
    expect(container.querySelector("pre code")?.textContent).toBe(
      "tokens = split(text)",
    );
    expect(container.querySelector("aside")?.textContent).toBe("Careful here");
  });

  test("gives an image its alt text and a formula its spoken text", () => {
    render(<LessonBlocks blocks={blocks} />);
    expect(
      screen.getByRole("img", { name: "A diagram of a tokenizer" }),
    ).toBeTruthy();
    expect(screen.getByText("Figure 1")).toBeTruthy();
    expect(screen.getByLabelText("R equals V over I").textContent).toBe(
      "R = V / I",
    );
  });

  test("renders text as text, never as markup", () => {
    const { container } = render(
      <LessonBlocks
        blocks={[
          {
            type: "paragraph",
            spans: [{ text: "<img src=x onerror=alert(1)>" }],
          },
        ]}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
});
