package com.flashmd.domain.study

import com.flashmd.domain.study.LearningBlocks.BlockCard
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// Mirrors packages/shared/src/study/learning-blocks.test.ts.
class LearningBlocksTest {

    private fun unseen(id: String) = BlockCard(id, seen = false, lastRating = null)
    private fun rated(id: String, rating: Int?) = BlockCard(id, seen = true, lastRating = rating)
    private fun mastered(id: String) = rated(id, LearningBlocks.MASTERED_RATING)

    private fun deck(n: Int, make: (String, Int) -> BlockCard) = List(n) { i -> make("c$i", i) }

    @Test fun `the block size is 40`() {
        assertEquals(40, LearningBlocks.BLOCK_SIZE)
    }

    @Test fun `a fresh deck admits exactly its first block`() {
        val cards = deck(100) { id, _ -> unseen(id) }
        assertEquals(0, LearningBlocks.currentBlock(cards))
        assertEquals(
            cards.take(40).map { it.id }.toSet(),
            LearningBlocks.admissibleNewCardIds(cards),
        )
    }

    @Test fun `a deck no bigger than one block admits every new card`() {
        assertEquals(25, LearningBlocks.admissibleNewCardIds(deck(25) { id, _ -> unseen(id) }).size)
    }

    @Test fun `the next block opens only when every card of the current one was last rated Perfect`() {
        val almost = deck(80) { id, i ->
            when {
                i < 39 -> mastered(id)
                i == 39 -> rated(id, 4)
                else -> unseen(id)
            }
        }
        assertEquals(0, LearningBlocks.currentBlock(almost))
        assertEquals(0, LearningBlocks.admissibleNewCardIds(almost).size)

        val done = deck(80) { id, i -> if (i < 40) mastered(id) else unseen(id) }
        assertEquals(1, LearningBlocks.currentBlock(done))
        assertEquals(done.drop(40).map { it.id }.toSet(), LearningBlocks.admissibleNewCardIds(done))
    }

    @Test fun `a mastered card that slips back re-closes the later block's new cards`() {
        val cards = deck(120) { id, i ->
            when {
                i == 7 -> rated(id, 4)
                i < 50 -> mastered(id)
                else -> unseen(id)
            }
        }
        assertEquals(0, LearningBlocks.currentBlock(cards))
        assertEquals(0, LearningBlocks.admissibleNewCardIds(cards).size)
    }

    @Test fun `a seen card with no recorded rating is not mastered`() {
        val cards = deck(50) { id, i -> if (i == 0) rated(id, null) else unseen(id) }
        assertEquals(0, LearningBlocks.currentBlock(cards))
    }

    @Test fun `a fully mastered deck has no current block and admits nothing`() {
        val cards = deck(90) { id, _ -> mastered(id) }
        assertNull(LearningBlocks.currentBlock(cards))
        assertEquals(0, LearningBlocks.admissibleNewCardIds(cards).size)
        assertNull(LearningBlocks.currentBlockCardIds(cards))
    }

    @Test fun `an empty deck has no current block`() {
        assertNull(LearningBlocks.currentBlock(emptyList()))
    }

    @Test fun `the last block may be short`() {
        val cards = deck(85) { id, i -> if (i < 80) mastered(id) else unseen(id) }
        assertEquals(2, LearningBlocks.currentBlock(cards))
        assertEquals(5, LearningBlocks.admissibleNewCardIds(cards).size)
    }

    @Test fun `currentBlockCardIds lists every card of the current block, seen or not`() {
        val cards = deck(60) { id, i ->
            when {
                i < 40 -> mastered(id)
                i < 45 -> rated(id, 3)
                else -> unseen(id)
            }
        }
        assertEquals(cards.drop(40).map { it.id }, LearningBlocks.currentBlockCardIds(cards))
    }

    @Test fun `the block size can be overridden`() {
        val cards = deck(10) { id, i -> if (i < 3) mastered(id) else unseen(id) }
        assertEquals(1, LearningBlocks.currentBlock(cards, 3))
        assertEquals(3, LearningBlocks.admissibleNewCardIds(cards, 3).size)
    }
}
