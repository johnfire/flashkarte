/**
 * Learning blocks: a large deck is studied in fixed blocks of LEARNING_BLOCK_SIZE
 * cards, in deck order. New cards are only introduced from the current block — the
 * first block that still holds a card whose most recent rating was not Perfect — so
 * a learner works on at most one block of unfamiliar cards at a time. Reviews of
 * cards already seen are never held back; only the introduction of new ones is.
 *
 * Blocks are computed on read from existing progress (no stored state), so they
 * apply to every deck and every learner without a migration. A deck of one block or
 * fewer behaves exactly as before.
 *
 * Mastery is the LAST rating, so it is reversible: a card of an earlier block that
 * slips back below Perfect makes that block current again, and new cards wait until
 * it is Perfect once more.
 *
 * Kept identical in Kotlin LearningBlocks (android/.../domain/study).
 */

export const LEARNING_BLOCK_SIZE = 40;

/** The rating ("Perfect") a card's latest review must have for it to count as mastered. */
export const MASTERED_RATING = 5;

/** One studiable card, in deck order. `seen` means the learner has a progress row for it. */
export interface BlockCard {
  id: string;
  seen: boolean;
  lastRating: number | null;
}

export interface BlockProgress {
  block_size: number;
  blocks_total: number;
  /** 1-based for display; null once every card is mastered. */
  current_block: number | null;
  current_block_cards: number;
  current_block_mastered: number;
}

function isMastered(card: BlockCard): boolean {
  return card.lastRating === MASTERED_RATING;
}

/** 0-based index of the first block with an unmastered card; null when there is none. */
export function currentBlock(
  cards: BlockCard[],
  blockSize = LEARNING_BLOCK_SIZE,
): number | null {
  const first = cards.findIndex((card) => !isMastered(card));
  return first === -1 ? null : Math.floor(first / blockSize);
}

function blockSlice(cards: BlockCard[], blockSize: number): BlockCard[] | null {
  const block = currentBlock(cards, blockSize);
  if (block === null) return null;
  return cards.slice(block * blockSize, (block + 1) * blockSize);
}

/** Ids of the cards of the current block, seen or not; null when the deck is mastered. */
export function currentBlockCardIds(
  cards: BlockCard[],
  blockSize = LEARNING_BLOCK_SIZE,
): string[] | null {
  return blockSlice(cards, blockSize)?.map((card) => card.id) ?? null;
}

/** The new cards a study queue may introduce now: the unseen cards of the current block. */
export function admissibleNewCardIds(
  cards: BlockCard[],
  blockSize = LEARNING_BLOCK_SIZE,
): Set<string> {
  const slice = blockSlice(cards, blockSize) ?? [];
  return new Set(slice.filter((card) => !card.seen).map((card) => card.id));
}

export function blockProgress(
  cards: BlockCard[],
  blockSize = LEARNING_BLOCK_SIZE,
): BlockProgress {
  const block = currentBlock(cards, blockSize);
  const slice = blockSlice(cards, blockSize) ?? [];
  return {
    block_size: blockSize,
    blocks_total: Math.ceil(cards.length / blockSize),
    current_block: block === null ? null : block + 1,
    current_block_cards: slice.length,
    current_block_mastered: slice.filter(isMastered).length,
  };
}
