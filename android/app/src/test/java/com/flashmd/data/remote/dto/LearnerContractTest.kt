package com.flashmd.data.remote.dto

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The learner API's real responses, captured by the server's own test (packages/server/.../
 * learner-api-contract.integration.test.ts) into src/test/resources/learner-contract. If the server
 * changes a response's shape it fails there until the files are regenerated, and if the app's types
 * cannot read a regenerated file it fails here, so the two cannot drift apart unnoticed.
 */
class LearnerContractTest {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private fun text(name: String): String =
        checkNotNull(javaClass.classLoader?.getResourceAsStream("learner-contract/$name.json")) {
            "missing contract file $name"
        }.bufferedReader().use { it.readText() }

    private inline fun <reified T> read(name: String): T = json.decodeFromString(text(name))

    @Test
    fun `the subject list decodes`() {
        val subjects = read<List<LearnSubjectDto>>("subjects")
        assertEquals("Contract", subjects.single().title)
        assertEquals(1, subjects.single().conceptCount)
    }

    @Test
    fun `an outline says which lessons are open, locked and waiting on what`() {
        val fresh = read<LearnerOutlineDto>("outline-fresh")
        assertEquals("Contract", fresh.subjectTitle)
        val lessons = fresh.modules.single().lessons
        assertEquals("Input side", fresh.modules.single().title)
        assertEquals(listOf("available", "locked"), lessons.map { it.access })
        assertEquals(listOf("tokens"), lessons[1].unlocksAfter.map { it.slug })
        assertFalse(lessons[1].unlocksAfter.single().passed)

        val paused = read<LearnerOutlineDto>("outline-in-progress").modules.single().lessons[0]
        assertEquals("in_progress", paused.access)
        assertTrue(paused.paused)

        val passed = read<LearnerOutlineDto>("outline-passed").modules.single().lessons
        assertEquals("passed", passed[0].access)
        assertEquals(2, passed[0].result?.firstTryRight)
        assertEquals(3, passed[0].result?.total)
        assertEquals("available", passed[1].access)
    }

    @Test
    fun `a screen step carries its number and every block type is understood`() {
        val started = read<LessonStepResponseDto>("start-screen")
        val screen = started.step as ScreenStepDto
        assertEquals("1", screen.number)
        assertEquals(0, screen.index)
        assertEquals(4, screen.total)
        assertFalse(screen.canGoBack)
        assertEquals(
            listOf(
                ParagraphBlockDto::class, ListBlockDto::class, ListBlockDto::class, CodeBlockDto::class,
                CalloutBlockDto::class, ImageBlockDto::class, ImageBlockDto::class, FormulaBlockDto::class,
            ),
            screen.blocks.map { it::class },
        )
        val paragraph = screen.blocks[0] as ParagraphBlockDto
        assertTrue(paragraph.spans[1].bold)
        assertTrue(paragraph.spans[3].italic)
        assertTrue(paragraph.spans[5].code)
        // A symbol in the sentence: its LaTeX in text, and the server's drawing and measurements.
        val symbol = paragraph.spans.last()
        assertEquals("d_k", symbol.text)
        assertEquals("d sub k", symbol.math?.spoken)
        assertEquals("<uuid>", symbol.math?.assetId)
        assertEquals(1.099, symbol.math?.widthEm)
        assertEquals(0.964, symbol.math?.heightEm)
        assertEquals(0.179, symbol.math?.depthEm)
        assertNull(paragraph.spans[0].math)
        assertTrue((screen.blocks[1] as ListBlockDto).ordered)
        assertEquals("python", (screen.blocks[3] as CodeBlockDto).language)
        assertEquals("warning", (screen.blocks[4] as CalloutBlockDto).tone)
        val stored = screen.blocks[5] as ImageBlockDto
        assertEquals("A diagram", stored.alt)
        assertEquals("expandable", stored.display)
        assertEquals("asset:0a1b2c3d-0000-4000-8000-000000000001", stored.src)
        val web = screen.blocks[6] as ImageBlockDto
        assertEquals("https://example.com/rc.svg", web.src)
        assertEquals("inline", web.display)
        val formula = screen.blocks[7] as FormulaBlockDto
        assertEquals("R equals V over I", formula.spoken)
        assertEquals("R = V / I", formula.latex)
        assertEquals("<uuid>", formula.assetId)
        assertEquals(4.373, formula.widthEm)
        assertEquals(0.283, formula.depthEm)

        assertTrue((read<LessonStepResponseDto>("next-screen").step as ScreenStepDto).canGoBack)
    }

    @Test
    fun `a question step shows the options and never says which is right`() {
        val raw = text("step-question")
        assertFalse("a step must not carry correctness", raw.contains("\"correct\""))
        assertFalse("a step must not carry the reasons", raw.contains("Because it"))
        val question = read<LessonStepResponseDto>("step-question").step as QuestionStepDto
        assertTrue("a question offers a choice", question.options.size >= 2)
        assertEquals(0, question.answered)
        assertEquals(3, question.total)
        assertFalse(question.helpOffered)
    }

    @Test
    fun `a wrong answer reveals the right one and sends the learner back to a screen`() {
        val reply = read<LessonAnswerResponseDto>("answer-wrong")
        assertFalse(reply.answer.correct)
        assertTrue(reply.answer.chosenPosition != reply.answer.correctPosition)
        assertTrue(reply.answer.reason.isNotEmpty())
        assertTrue(reply.answer.correctReason.isNotEmpty())
        val reread = reply.step as RemediationStepDto
        assertEquals(0, reread.position)
        assertEquals(1, reread.of)
        assertFalse(reply.passed)
        assertTrue(read<LessonStepResponseDto>("continue-remediation").step is QuestionStepDto)
    }

    @Test
    fun `passing reports the result and what it opened`() {
        val reply = read<LessonAnswerResponseDto>("answer-passed")
        assertTrue(reply.passed)
        val passed = reply.step as PassedStepDto
        assertEquals(2, passed.firstTryRight)
        assertEquals(3, passed.total)
        assertEquals(listOf("embeddings"), reply.unlocked.map { it.slug })
        assertTrue(read<LessonAnswerResponseDto>("answer-right").step is QuestionStepDto)
    }

    @Test
    fun `coming back later is a paused step`() {
        assertEquals(PausedStepDto, read<LessonStepResponseDto>("paused").step)
    }

    @Test
    fun `open book, comments and reviews decode`() {
        assertEquals(4, read<LessonScreensDto>("open-book-screens").screens.size)
        val comment = read<ScreenCommentDto>("comment")
        assertEquals("1", comment.number)
        assertEquals("What is a byte?", comment.body)

        val due = read<DueReviewsDto>("reviews-due")
        assertEquals(3, due.due.size)
        assertEquals("tokens", due.due[0].lesson)
        assertTrue(read<ReviewStepResponseDto>("review-start").step is QuestionStepDto)
        assertTrue(read<ReviewAnswerResponseDto>("review-answer-wrong").step is RemediationStepDto)
        assertTrue(read<ReviewStepResponseDto>("review-continue").step is QuestionStepDto)
        val done = read<ReviewAnswerResponseDto>("review-answer-done")
        assertEquals("wrong", (done.step as ReviewDoneStepDto).firstTry)
        assertTrue(done.answer.correct)
    }

    @Test
    fun `a block or step kind from a newer server is skipped, not a crash`() {
        val blocks = json.decodeFromString<List<BlockDto>>(
            """[{"type":"paragraph","spans":[{"text":"hi"}]},{"type":"hologram","depth":3}]""",
        )
        assertEquals(ParagraphBlockDto::class, blocks[0]::class)
        assertEquals(UnknownBlockDto("hologram"), blocks[1])

        val step = json.decodeFromString<StepDto>("""{"kind":"teleport","where":"mars"}""")
        assertEquals(UnknownStepDto("teleport"), step)
    }
}
