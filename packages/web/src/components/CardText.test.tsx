import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CardText, splitCardText } from "./CardText";

describe("splitCardText", () => {
  it("recognizes an https image on its own line", () => {
    const segments = splitCardText("![a divider](https://example.com/x.svg)");
    expect(segments).toEqual([
      { type: "image", alt: "a divider", src: "https://example.com/x.svg" },
    ]);
  });

  it("recognizes a root-relative image inline with text", () => {
    const segments = splitCardText(
      "See below: ![schematic](/schematics/ch1-rc-lowpass.svg) — an RC lowpass.",
    );
    expect(segments).toEqual([
      { type: "text", value: "See below: " },
      { type: "image", alt: "schematic", src: "/schematics/ch1-rc-lowpass.svg" },
      { type: "text", value: " — an RC lowpass." },
    ]);
  });

  it("leaves a non-https, non-relative URL scheme as literal text", () => {
    const text = "![x](javascript:alert(1))";
    expect(splitCardText(text)).toEqual([{ type: "text", value: text }]);
  });

  it("leaves plain text with no image markup untouched", () => {
    const text = "Vout = Vin · R2/(R1+R2).";
    expect(splitCardText(text)).toEqual([{ type: "text", value: text }]);
  });
});

describe("CardText", () => {
  it("renders an allowed image as an <img> with alt text, nothing else", () => {
    const { container } = render(
      <CardText text="![voltage divider](/schematics/ch1-voltage-divider.svg)" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("/schematics/ch1-voltage-divider.svg");
    expect(img?.getAttribute("alt")).toBe("voltage divider");
    expect(container.querySelectorAll("img").length).toBe(1);
  });

  it("renders a hostile alt attribute as an inert string, not markup", () => {
    const { container } = render(
      <CardText text='![" /><script>alert(1)</script>](/schematics/x.svg)' />,
    );
    expect(container.querySelectorAll("script").length).toBe(0);
    expect(container.querySelectorAll("img").length).toBe(1);
  });

  it("still renders surrounding text when the image URL is disallowed", () => {
    const { container } = render(
      <CardText text="before ![x](ftp://example.com/x.svg) after" />,
    );
    expect(container.querySelectorAll("img").length).toBe(0);
    expect(container.textContent).toBe(
      "before ![x](ftp://example.com/x.svg) after",
    );
  });
});
