import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import "../../i18n";
import { LandingVideo } from "./LandingVideo";

describe("LandingVideo", () => {
  test("serves the promo from our own origin, loads nothing until played, and ships captions", () => {
    const { container } = render(<LandingVideo />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("preload")).toBe("none");
    expect(video?.getAttribute("poster")).toBe(
      "/video/learnwohl-promo-poster.jpg",
    );
    expect(container.querySelector("source")?.getAttribute("src")).toBe(
      "/video/learnwohl-promo.mp4",
    );
    const track = container.querySelector("track");
    expect(track?.getAttribute("kind")).toBe("captions");
    expect(track?.getAttribute("src")).toBe("/video/learnwohl-promo.en.vtt");
    expect(screen.getByText("See it in 30 seconds")).toBeTruthy();
  });
});
