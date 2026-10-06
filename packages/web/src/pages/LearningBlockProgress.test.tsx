import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LearningBlockProgress } from "./LearningBlockProgress";
import { api } from "../api/client";
import "../i18n";

vi.mock("../api/client", () => ({
  api: { study: { stats: vi.fn() } },
}));

const mockStats = (
  api as unknown as { study: { stats: ReturnType<typeof vi.fn> } }
).study.stats;

const block = (overrides: Record<string, unknown> = {}) => ({
  total: 1000,
  new: 900,
  due: 40,
  learned: 50,
  learning_block: {
    block_size: 40,
    blocks_total: 25,
    current_block: 3,
    current_block_cards: 40,
    current_block_mastered: 12,
    ...overrides,
  },
});

describe("LearningBlockProgress", () => {
  beforeEach(() => vi.clearAllMocks());

  test("shows the current block and how much of it is mastered", async () => {
    mockStats.mockResolvedValue(block());
    render(<LearningBlockProgress deckId="d1" refreshKey={0} />);
    expect(
      await screen.findByText("Block 3 of 25 · 12/40 mastered"),
    ).toBeInTheDocument();
    expect(mockStats).toHaveBeenCalledWith("d1");
  });

  test("uses the real size of a short last block", async () => {
    mockStats.mockResolvedValue(
      block({
        current_block: 25,
        current_block_cards: 5,
        current_block_mastered: 2,
      }),
    );
    render(<LearningBlockProgress deckId="d1" refreshKey={0} />);
    expect(
      await screen.findByText("Block 25 of 25 · 2/5 mastered"),
    ).toBeInTheDocument();
  });

  test("says when every block is mastered", async () => {
    mockStats.mockResolvedValue(
      block({
        current_block: null,
        current_block_cards: 0,
        current_block_mastered: 0,
      }),
    );
    render(<LearningBlockProgress deckId="d1" refreshKey={0} />);
    expect(
      await screen.findByText("All 25 blocks mastered"),
    ).toBeInTheDocument();
  });

  test("shows nothing for a deck of a single block", async () => {
    mockStats.mockResolvedValue(block({ blocks_total: 1, current_block: 1 }));
    const { container } = render(
      <LearningBlockProgress deckId="d1" refreshKey={0} />,
    );
    await waitFor(() => expect(mockStats).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test("shows nothing when the server sends no block info", async () => {
    mockStats.mockResolvedValue({ total: 10, new: 0, due: 0, learned: 0 });
    const { container } = render(
      <LearningBlockProgress deckId="d1" refreshKey={0} />,
    );
    await waitFor(() => expect(mockStats).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test("a failed stats call never breaks the page: it just shows nothing", async () => {
    mockStats.mockRejectedValue(new Error("offline"));
    const { container } = render(
      <LearningBlockProgress deckId="d1" refreshKey={0} />,
    );
    await waitFor(() => expect(mockStats).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test("refetches when the refresh key changes, so ratings show up", async () => {
    mockStats.mockResolvedValue(block());
    const { rerender } = render(
      <LearningBlockProgress deckId="d1" refreshKey={0} />,
    );
    await screen.findByText("Block 3 of 25 · 12/40 mastered");
    mockStats.mockResolvedValue(block({ current_block_mastered: 13 }));
    rerender(<LearningBlockProgress deckId="d1" refreshKey={1} />);
    expect(
      await screen.findByText("Block 3 of 25 · 13/40 mastered"),
    ).toBeInTheDocument();
  });
});
