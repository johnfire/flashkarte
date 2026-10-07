import {
  LEARNING_BLOCK_SIZE,
  MASTERED_RATING,
  BlockCard,
  admissibleNewCardIds,
  blockProgress,
  currentBlock,
  currentBlockCardIds,
} from "./learning-blocks";

const unseen = (id: string): BlockCard => ({
  id,
  seen: false,
  lastRating: null,
});
const rated = (id: string, lastRating: number | null): BlockCard => ({
  id,
  seen: true,
  lastRating,
});
const mastered = (id: string) => rated(id, MASTERED_RATING);

/** n cards c0..c(n-1), each built by `make`. */
function deck(n: number, make: (id: string, i: number) => BlockCard) {
  return Array.from({ length: n }, (_, i) => make(`c${i}`, i));
}

describe("learning blocks", () => {
  test("the block size is 40", () => {
    expect(LEARNING_BLOCK_SIZE).toBe(40);
  });

  test("a fresh deck admits exactly its first block", () => {
    const cards = deck(100, unseen);
    expect(currentBlock(cards)).toBe(0);
    expect([...admissibleNewCardIds(cards)]).toEqual(
      cards.slice(0, 40).map((c) => c.id),
    );
  });

  test("a deck no bigger than one block behaves as before: every new card is admissible", () => {
    const cards = deck(25, unseen);
    expect(admissibleNewCardIds(cards).size).toBe(25);
  });

  test("the next block opens only when every card of the current one was last rated Perfect", () => {
    const almost = deck(80, (id, i) =>
      i < 39 ? mastered(id) : i === 39 ? rated(id, 4) : unseen(id),
    );
    expect(currentBlock(almost)).toBe(0);
    expect(admissibleNewCardIds(almost).size).toBe(0);

    const done = deck(80, (id, i) => (i < 40 ? mastered(id) : unseen(id)));
    expect(currentBlock(done)).toBe(1);
    expect([...admissibleNewCardIds(done)]).toEqual(
      done.slice(40, 80).map((c) => c.id),
    );
  });

  test("a mastered card that slips back re-closes the later block's new cards", () => {
    // Block 0 was finished and block 1 started; then a block-0 card was rated Good.
    const cards = deck(120, (id, i) =>
      i === 7 ? rated(id, 4) : i < 50 ? mastered(id) : unseen(id),
    );
    expect(currentBlock(cards)).toBe(0);
    expect(admissibleNewCardIds(cards).size).toBe(0);
  });

  test("a seen card with no recorded rating is not mastered", () => {
    const cards = deck(50, (id, i) => (i === 0 ? rated(id, null) : unseen(id)));
    expect(currentBlock(cards)).toBe(0);
  });

  test("an existing learner spread over several blocks gets no new cards until block 0 is mastered", () => {
    // 300 cards already opened before blocks existed, none yet Perfect.
    const cards = deck(1000, (id, i) => (i < 300 ? rated(id, 3) : unseen(id)));
    expect(currentBlock(cards)).toBe(0);
    expect(admissibleNewCardIds(cards).size).toBe(0);
  });

  test("a fully mastered deck has no current block and admits nothing", () => {
    const cards = deck(90, mastered);
    expect(currentBlock(cards)).toBeNull();
    expect(admissibleNewCardIds(cards).size).toBe(0);
    expect(currentBlockCardIds(cards)).toBeNull();
  });

  test("an empty deck has no current block", () => {
    expect(currentBlock([])).toBeNull();
  });

  test("the last block may be short", () => {
    const cards = deck(85, (id, i) => (i < 80 ? mastered(id) : unseen(id)));
    expect(currentBlock(cards)).toBe(2);
    expect(admissibleNewCardIds(cards).size).toBe(5);
  });

  test("currentBlockCardIds lists every card of the current block, seen or not", () => {
    const cards = deck(60, (id, i) =>
      i < 40 ? mastered(id) : i < 45 ? rated(id, 3) : unseen(id),
    );
    expect(currentBlockCardIds(cards)).toEqual(
      cards.slice(40, 60).map((c) => c.id),
    );
  });

  test("blockProgress reports a 1-based block number for display", () => {
    const cards = deck(1000, (id, i) =>
      i < 80 ? mastered(id) : i < 90 ? mastered(id) : unseen(id),
    );
    expect(blockProgress(cards)).toEqual({
      block_size: 40,
      blocks_total: 25,
      current_block: 3,
      current_block_cards: 40,
      current_block_mastered: 10,
    });
  });

  test("blockProgress of a finished deck has no current block", () => {
    expect(blockProgress(deck(40, mastered))).toEqual({
      block_size: 40,
      blocks_total: 1,
      current_block: null,
      current_block_cards: 0,
      current_block_mastered: 0,
    });
  });

  test("the block size can be overridden", () => {
    const cards = deck(10, (id, i) => (i < 3 ? mastered(id) : unseen(id)));
    expect(currentBlock(cards, 3)).toBe(1);
    expect(admissibleNewCardIds(cards, 3).size).toBe(3);
  });
});
