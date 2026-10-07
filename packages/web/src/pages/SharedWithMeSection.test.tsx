import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api, ApiError } from "../api/client";
import type { SharedDeck } from "../api/types";
import "../i18n";
import { SharedWithMeSection } from "./SharedWithMeSection";

vi.mock("../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    reportClientError: vi.fn(),
    api: {
      ...actual.api,
      decks: { ...actual.api.decks, listShared: vi.fn(), subscribe: vi.fn() },
    },
  };
});

const DECK: SharedDeck = {
  id: "d1",
  referenceNumber: 7,
  title: "Zellen",
  contentLanguage: "de",
  cardCount: 12,
  author: "Frau Huber",
  subscribed: false,
  scopes: ["teacher_students"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("lists decks waiting to be added, with where they came from", async () => {
  vi.mocked(api.decks.listShared).mockResolvedValue({ decks: [DECK] });
  render(<SharedWithMeSection onAdded={vi.fn()} />);
  expect(await screen.findByText("Zellen")).toBeInTheDocument();
  expect(
    screen.getByText("12 cards · from your course leader · Frau Huber"),
  ).toBeInTheDocument();
});

test("adding a deck subscribes, hides it here and refreshes My Decks", async () => {
  vi.mocked(api.decks.listShared).mockResolvedValue({ decks: [DECK] });
  vi.mocked(api.decks.subscribe).mockResolvedValue(undefined);
  const onAdded = vi.fn();
  render(<SharedWithMeSection onAdded={onAdded} />);

  await userEvent.click(await screen.findByRole("button", { name: "Add" }));

  expect(api.decks.subscribe).toHaveBeenCalledWith("d1");
  expect(onAdded).toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.queryByText("Zellen")).not.toBeInTheDocument(),
  );
});

test("the free-plan limit message is shown when adding is refused", async () => {
  vi.mocked(api.decks.listShared).mockResolvedValue({ decks: [DECK] });
  vi.mocked(api.decks.subscribe).mockRejectedValue(
    new ApiError(403, "PLAN_LIMIT_REACHED", "Free accounts can have up to 10"),
  );
  render(<SharedWithMeSection onAdded={vi.fn()} />);

  await userEvent.click(await screen.findByRole("button", { name: "Add" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Free accounts can have up to 10",
  );
});

test("renders nothing when everything shared is already added", async () => {
  vi.mocked(api.decks.listShared).mockResolvedValue({
    decks: [{ ...DECK, subscribed: true }],
  });
  const { container } = render(<SharedWithMeSection onAdded={vi.fn()} />);
  await waitFor(() => expect(api.decks.listShared).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

test("a failed load hides the section instead of breaking the page", async () => {
  vi.mocked(api.decks.listShared).mockRejectedValue(new Error("offline"));
  const { container } = render(<SharedWithMeSection onAdded={vi.fn()} />);
  await waitFor(() => expect(api.decks.listShared).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
