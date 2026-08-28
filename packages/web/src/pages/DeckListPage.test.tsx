import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError, reportClientError } from "../api/client";
import type { DeckWithCounts } from "../api/types";
import "../i18n";
import { DeckListPage } from "./DeckListPage";

// Keep the real ApiError and isVerificationRequired: a stub ApiError that drops
// `code` cannot express the difference between a genuine failure and the
// deliberate verification refusal, which is exactly what this page branches on.
vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    decks: { list: vi.fn(), remove: vi.fn(), setPublic: vi.fn() },
  },
  reportClientError: vi.fn(),
}));

// Mutable so a test can flip the account to unverified; reset in beforeEach.
const auth = vi.hoisted(() => ({
  user: {
    accountType: "free",
    email: "learner@example.com",
    emailVerifiedAt: "2026-01-01T00:00:00Z" as string | null,
  },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, logout: vi.fn() }),
}));

const mockedDecksApi = api.decks as unknown as {
  list: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setPublic: ReturnType<typeof vi.fn>;
};

const deck: DeckWithCounts = {
  id: "deck-1",
  title: "German nouns",
  source_filename: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  card_count: 3,
  due_count: 2,
  is_public: false,
  viewed_count: 1,
  new_count: 1,
  again_count: 0,
  hard_count: 0,
  good_count: 1,
  easy_count: 0,
  speech_enabled: null,
  speech_front_lang: null,
  speech_back_lang: null,
  speech_autoplay: null,
  speech_rate: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DeckListPage />
    </MemoryRouter>,
  );
}

describe("DeckListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { ...auth.user, emailVerifiedAt: "2026-01-01T00:00:00Z" };
  });

  test("renders loading and loaded states", async () => {
    mockedDecksApi.list.mockResolvedValue([deck]);
    renderPage();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("German nouns")).toBeInTheDocument();
  });

  test("renders API load failures", async () => {
    mockedDecksApi.list.mockRejectedValue(
      new ApiError(503, "UNAVAILABLE", "Deck service unavailable"),
    );
    renderPage();

    expect(
      await screen.findByText("Deck service unavailable"),
    ).toBeInTheDocument();
    expect(reportClientError).toHaveBeenCalled();
  });

  test("an unverified account gets the verify panel, not an error", async () => {
    auth.user = { ...auth.user, emailVerifiedAt: null };
    renderPage();

    expect(
      await screen.findByText("Verify your email to get started"),
    ).toBeInTheDocument();
    expect(screen.getByText(/learner@example\.com/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "read the getting started guide" }),
    ).toBeInTheDocument();
    // The generic empty hint is for verified accounts with no decks yet.
    expect(
      screen.queryByText("No decks yet. Create one to start studying."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Couldn't load your decks"),
    ).not.toBeInTheDocument();
    // A request that could only ever 403 is not worth making, and a deliberate
    // refusal is not a client error.
    expect(mockedDecksApi.list).not.toHaveBeenCalled();
    expect(reportClientError).not.toHaveBeenCalled();
  });

  test("a stale verified flag still does not log the gate as an error", async () => {
    mockedDecksApi.list.mockRejectedValue(
      new ApiError(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Verify your email before using this feature",
      ),
    );
    renderPage();

    expect(
      await screen.findByText("No decks yet. Create one to start studying."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Verify your email before using this feature"),
    ).not.toBeInTheDocument();
    expect(reportClientError).not.toHaveBeenCalled();
  });

  test("deletes a deck and toggles sharing optimistically", async () => {
    mockedDecksApi.list.mockResolvedValue([deck]);
    mockedDecksApi.remove.mockResolvedValue(undefined);
    mockedDecksApi.setPublic.mockReturnValue(new Promise(() => {}));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    await screen.findByText("German nouns");

    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("button", { name: "Unshare" })).toBeInTheDocument();
    expect(mockedDecksApi.setPublic).toHaveBeenCalledWith("deck-1", true);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("German nouns")).not.toBeInTheDocument(),
    );
    expect(mockedDecksApi.remove).toHaveBeenCalledWith("deck-1");
  });
});
