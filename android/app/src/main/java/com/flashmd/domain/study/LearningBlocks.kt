package com.flashmd.domain.study

/**
 * Learning blocks: a large deck is studied in fixed blocks of [BLOCK_SIZE] cards, in
 * deck order. New cards are only introduced from the current block — the first block
 * that still holds a card whose most recent rating was not Perfect. Reviews of cards
 * already seen are never held back; only the introduction of new ones is.
 *
 * Mirrors packages/shared/src/study/learning-blocks.ts. The server applies it to the
 * online study batch; this copy applies it to the offline queue so a phone without a
 * connection doesn't open the whole deck at once. Keep the two identical.
 */
object LearningBlocks {
    const val BLOCK_SIZE = 40

    /** The rating ("Perfect") a card's latest review must have to count as mastered. */
    const val MASTERED_RATING = 5

    /** One studiable card, in deck order. [seen] means there is a progress row for it. */
    data class BlockCard(val id: String, val seen: Boolean, val lastRating: Int?)

    /** For display ("Block 3 of 25 · 12/40 mastered"); same fields as the server's learning_block. */
    data class BlockProgress(
        val blockSize: Int,
        val blocksTotal: Int,
        /** 1-based; null once every card is mastered. */
        val currentBlock: Int?,
        val currentBlockCards: Int,
        val currentBlockMastered: Int,
    )

    private fun BlockCard.isMastered() = lastRating == MASTERED_RATING

    /** 0-based index of the first block with an unmastered card; null when there is none. */
    fun currentBlock(cards: List<BlockCard>, blockSize: Int = BLOCK_SIZE): Int? {
        val first = cards.indexOfFirst { !it.isMastered() }
        return if (first == -1) null else first / blockSize
    }

    private fun blockSlice(cards: List<BlockCard>, blockSize: Int): List<BlockCard>? {
        val block = currentBlock(cards, blockSize) ?: return null
        val from = block * blockSize
        return cards.subList(from, minOf(from + blockSize, cards.size))
    }

    /** Ids of the cards of the current block, seen or not; null when the deck is mastered. */
    fun currentBlockCardIds(cards: List<BlockCard>, blockSize: Int = BLOCK_SIZE): List<String>? =
        blockSlice(cards, blockSize)?.map { it.id }

    /** The new cards a study queue may introduce now: the unseen cards of the current block. */
    fun admissibleNewCardIds(cards: List<BlockCard>, blockSize: Int = BLOCK_SIZE): Set<String> =
        blockSlice(cards, blockSize).orEmpty().filter { !it.seen }.map { it.id }.toSet()

    fun blockProgress(cards: List<BlockCard>, blockSize: Int = BLOCK_SIZE): BlockProgress {
        val slice = blockSlice(cards, blockSize).orEmpty()
        return BlockProgress(
            blockSize = blockSize,
            blocksTotal = (cards.size + blockSize - 1) / blockSize,
            currentBlock = currentBlock(cards, blockSize)?.plus(1),
            currentBlockCards = slice.size,
            currentBlockMastered = slice.count { it.isMastered() },
        )
    }
}
