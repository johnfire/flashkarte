package com.flashmd.ui.screens.learn

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.isRoot
import androidx.compose.ui.test.onLast
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.lifecycle.SavedStateHandle
import androidx.test.platform.app.InstrumentationRegistry
import com.flashmd.data.remote.FlashkarteApi
import com.flashmd.data.remote.dto.DueReviewsDto
import com.flashmd.data.remote.dto.LearnerOutlineDto
import com.flashmd.data.remote.dto.LessonAnswerResponseDto
import com.flashmd.data.remote.dto.LessonScreensDto
import com.flashmd.data.remote.dto.LessonStepResponseDto
import com.flashmd.data.remote.dto.ScreenCommentDto
import com.flashmd.data.repository.LearnRepository
import com.flashmd.ui.screens.learn.LearnerFixtures.read
import com.flashmd.ui.theme.FlashMdTheme
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import java.io.File
import java.lang.reflect.InvocationHandler
import java.lang.reflect.Proxy
import androidx.compose.runtime.CompositionLocalProvider
import coil.ImageLoader
import coil.decode.SvgDecoder
import com.flashmd.data.remote.dto.FormulaBlockDto
import com.flashmd.data.remote.dto.HelpNoticeDto
import com.flashmd.data.remote.dto.ScreenSourceDto
import com.flashmd.data.remote.dto.ImageBlockDto
import com.flashmd.data.remote.dto.InlineMathDto
import com.flashmd.data.remote.dto.ParagraphBlockDto
import com.flashmd.data.remote.dto.ScreenStepDto
import com.flashmd.data.remote.dto.SpanDto
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody

/**
 * The learner screens drawn on a device from the server's real responses (the same files the JVM
 * contract test decodes). The API is scripted: each call answers with the next response for that
 * endpoint, so the tests exercise the real repository, view models and screens, and only the
 * network is replaced. Screenshots go to the app's files directory for a person to look at.
 */
class LearnerScreensTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()

    private val calls = mutableListOf<String>()

    /** An API whose endpoints return the scripted responses in order (the last repeats). */
    private fun scriptedApi(script: Map<String, List<Any>>): FlashkarteApi {
        val positions = mutableMapOf<String, Int>()
        val handler = InvocationHandler { _, method, args ->
            calls += method.name
            val answers = script[method.name] ?: error("Unscripted call ${method.name}")
            val index = positions.getOrDefault(method.name, 0)
            positions[method.name] = index + 1
            if (method.name == "commentOnScreen") calls += "comment:" + (args!![2] as com.flashmd.data.remote.dto.CommentRequest).body
            answers[minOf(index, answers.lastIndex)]
        }
        return Proxy.newProxyInstance(
            FlashkarteApi::class.java.classLoader,
            arrayOf(FlashkarteApi::class.java),
            handler,
        ) as FlashkarteApi
    }

    private fun lessonViewModel(api: FlashkarteApi) = LessonViewModel(
        LearnRepository(api),
        SavedStateHandle(mapOf("subjectId" to "s1", "slug" to "tokens")),
    )

    private fun show(dark: Boolean = false, content: @androidx.compose.runtime.Composable () -> Unit) {
        compose.setContent { FlashMdTheme(darkTheme = dark) { content() } }
    }

    /** The options repeat their text (several WRONG ones); any one of them will do. */
    private fun androidx.compose.ui.test.junit4.AndroidComposeTestRule<*, *>.onAllNodesWithTextLast(text: String): SemanticsNodeInteraction {
        val nodes = onAllNodesWithText(text)
        return nodes[nodes.fetchSemanticsNodes().lastIndex]
    }

    /** The whole display, which (unlike a composable's own capture) includes an open dialog's window. */
    private fun wholeScreenShot(name: String) {
        val bitmap = InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot()
        val dir = InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null)!!
        File(dir, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun shot(name: String, root: Int? = null) {
        // With a dialog open there are two roots (the screen and the dialog); by default take the last.
        val roots = compose.onAllNodes(isRoot())
        val target = if (root != null) roots[root] else roots.onLast()
        val bitmap = target.captureToImage().asAndroidBitmap()
        val dir = InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null)!!
        File(dir, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test
    fun a_screen_shows_its_position_number_and_every_block_type() {
        val api = scriptedApi(mapOf("startLesson" to listOf(read<LessonStepResponseDto>("start-screen"))))
        val vm = lessonViewModel(api)
        show { LessonScreen(onBack = {}, onOpenLesson = {}, viewModel = vm, images = LessonImages("s1", null)) }

        compose.onNodeWithText("Screen 1 of 4").assertExists()
        compose.onNodeWithText("Screen 1").assertExists()
        compose.onNodeWithText("Careful here").assertExists()
        // The expandable diagram is a button (its picture opens full-screen), with its caption.
        compose.onNodeWithText("Show diagram").assertExists()
        compose.onNodeWithText("Figure 1").assertExists()
        compose.onNodeWithContentDescription("R equals V over I").assertExists()
        compose.onNodeWithText("Back").assertIsNotEnabled()
        compose.onNodeWithText("Next").assertIsEnabled()
        shot("learn-screen")
    }

    @Test
    fun a_screen_can_be_commented_on_against_its_number() {
        val api = scriptedApi(
            mapOf(
                "startLesson" to listOf(read<LessonStepResponseDto>("start-screen")),
                "commentOnScreen" to listOf(read<ScreenCommentDto>("comment")),
            ),
        )
        show { LessonScreen(onBack = {}, onOpenLesson = {}, viewModel = lessonViewModel(api), images = LessonImages("s1", null)) }

        compose.onNodeWithText("Comment on screen 1").performScrollTo().performClick()
        compose.onNodeWithText("What is unclear or wrong on screen 1?").performTextInput("What is a byte?")
        compose.onNodeWithText("Save comment").performScrollTo().performClick()
        compose.waitForIdle()
        compose.onNodeWithText("Comment on screen 1 saved. Your AI can read it.").assertExists()
        assert(calls.contains("comment:What is a byte?")) { "the comment was sent: $calls" }
    }

    @Test
    fun a_wrong_answer_shows_why_then_sends_the_learner_back_to_the_screen() {
        val question = read<LessonStepResponseDto>("step-question")
        val wrong = read<LessonAnswerResponseDto>("answer-wrong")
        val api = scriptedApi(
            mapOf(
                "startLesson" to listOf(question),
                "lessonAnswer" to listOf(wrong),
                "lessonContinue" to listOf(read<LessonStepResponseDto>("continue-remediation")),
            ),
        )
        show { LessonScreen(onBack = {}, onOpenLesson = {}, viewModel = lessonViewModel(api), images = LessonImages("s1", null)) }

        compose.onNodeWithText("Question 1 of 3").assertExists()
        // No verdict before answering, and Check is off until something is chosen.
        compose.onNodeWithText("Not quite.").assertDoesNotExist()
        compose.onNodeWithText("Check answer").assertIsNotEnabled()
        shot("learn-question")

        compose.onAllNodesWithTextLast("WRONG").performClick()
        compose.onNodeWithText("Check answer").assertIsEnabled().performClick()

        compose.onNodeWithText("Not quite.").assertExists()
        compose.onNodeWithText("Because it is not.").assertExists()
        compose.onNodeWithText("Your answer").assertExists()
        compose.onNodeWithText("Right answer").assertExists()
        shot("learn-wrong-answer")

        compose.onNodeWithText("Look at the screen again").performScrollTo().performClick()
        compose.onNodeWithText("Re-read 1 of 1").assertExists()
        shot("learn-reread")
        compose.onNodeWithText("Continue").performScrollTo().performClick()
        compose.onNodeWithText("Question 1 of 3").assertExists()
        assertEquals(1, calls.count { it == "lessonAnswer" })
    }

    @Test
    fun the_wrong_answer_in_dark_mode() {
        val api = scriptedApi(
            mapOf(
                "startLesson" to listOf(read<LessonStepResponseDto>("step-question")),
                "lessonAnswer" to listOf(read<LessonAnswerResponseDto>("answer-wrong")),
            ),
        )
        show(dark = true) { LessonScreen(onBack = {}, onOpenLesson = {}, viewModel = lessonViewModel(api), images = LessonImages("s1", null)) }
        compose.onAllNodesWithTextLast("WRONG").performClick()
        compose.onNodeWithText("Check answer").performClick()
        compose.onNodeWithText("Not quite.").assertExists()
        shot("learn-wrong-answer-dark")
    }

    @Test
    fun passing_shows_the_result_and_what_opened() {
        val api = scriptedApi(
            mapOf(
                "startLesson" to listOf(read<LessonStepResponseDto>("step-question")),
                "lessonAnswer" to listOf(read<LessonAnswerResponseDto>("answer-passed")),
            ),
        )
        show { LessonScreen(onBack = {}, onOpenLesson = {}, viewModel = lessonViewModel(api), images = LessonImages("s1", null)) }
        compose.onAllNodesWithTextLast("RIGHT").performClick()
        compose.onNodeWithText("Check answer").performClick()
        compose.onNodeWithText("Continue").performScrollTo().performClick()
        compose.onNodeWithText("Lesson passed").assertExists()
        compose.onNodeWithText("2 of 3 questions right on the first try.").assertExists()
        compose.onNodeWithText("Embeddings").assertExists()
        shot("learn-passed")
    }

    @Test
    fun the_outline_says_each_state_in_words_and_locks_what_is_not_open() {
        val outline = withDistinctIds(read<LearnerOutlineDto>("outline-in-progress"))
        show { OutlineContent(outline, onOpenLesson = {}, onReadLesson = {}, onReviews = {}) }
        compose.onNodeWithText("Input side").assertExists()
        compose.onNodeWithText("In progress · Come back later").assertExists()
        compose.onNodeWithText("Locked").assertExists()
        compose.onNodeWithText("Opens after you pass: Tokens").assertExists()
        compose.onNodeWithText("Continue").assertExists()
        shot("learn-outline")
    }

    @Test
    fun the_outline_offers_reviews_and_reading_a_passed_lesson_again() {
        val outline = read<LearnerOutlineDto>("outline-passed").let {
            LearnerOutlineDtoWithDue(it, 3)
        }
        show { OutlineContent(outline, onOpenLesson = {}, onReadLesson = {}, onReviews = {}) }
        compose.onNodeWithText("3 questions are due for review").assertExists()
        compose.onNodeWithText("Passed").assertExists()
        compose.onNodeWithText("2 of 3 right on the first try").assertExists()
        compose.onNodeWithText("Read again").assertExists()
        compose.onNodeWithText("Start").assertExists()
    }

    // --- stored diagrams ---

    private val diagram = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <rect x="10" y="30" width="60" height="40" fill="#fff" stroke="#111" stroke-width="4"/>
        <line x1="70" y1="50" x2="150" y2="50" stroke="#111" stroke-width="4"/></svg>"""
    private val assetId = "0a1b2c3d-0000-4000-8000-000000000001"
    private val requested = mutableListOf<String>()

    /** An image loader whose network is a function, so no server is needed. */
    private fun imageLoaderAnswering(code: Int): ImageLoader {
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            requested += chain.request().url.toString()
            Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(code)
                .message(if (code == 200) "OK" else "Not Found")
                .body(diagram.toResponseBody("image/svg+xml".toMediaType())).build()
        }.build()
        return ImageLoader.Builder(compose.activity).okHttpClient(client)
            .components { add(SvgDecoder.Factory()) }.build()
    }

    private fun screenWith(display: String) = LessonUiState(
        title = "Circuits",
        busy = false,
        step = ScreenStepDto(
            number = "1", index = 0, total = 4, canGoBack = false,
            blocks = listOf(
                ParagraphBlockDto(listOf(SpanDto("An RC filter"))),
                ImageBlockDto(src = "asset:$assetId", alt = "An RC circuit", display = display, caption = "Figure 1"),
            ),
        ),
    )

    private val noActions = LessonActions(
        next = {}, back = {}, carryOn = {}, pause = {}, resume = {}, answer = {},
        afterFeedback = {}, comment = { _, _ -> }, dismissComment = {}, toggleOpenBook = {},
        askForMore = { _, _ -> }, dismissHelp = {}, toOutline = {}, openLesson = {},
    )

    private fun showDiagramScreen(display: String, code: Int = 200, dark: Boolean = false) {
        val images = LessonImages("s1", imageLoaderAnswering(code))
        show(dark = dark) {
            CompositionLocalProvider(LocalLessonImages provides images) {
                LessonBody(screenWith(display), noActions)
            }
        }
    }

    @Test
    fun a_stored_diagram_is_fetched_with_the_subjects_route_and_drawn_inline() {
        showDiagramScreen("inline")
        compose.waitUntil(5_000) {
            compose.onAllNodesWithContentDescription("An RC circuit").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Figure 1").assertExists()
        assertEquals(true, requested.single().endsWith("/api/subjects/s1/assets/$assetId"))
        compose.waitForIdle()
        shot("learn-diagram-inline")
    }

    @Test
    fun a_stored_diagram_keeps_its_light_surface_in_dark_mode() {
        showDiagramScreen("inline", dark = true)
        compose.waitUntil(5_000) {
            compose.onAllNodesWithContentDescription("An RC circuit").fetchSemanticsNodes().isNotEmpty()
        }
        compose.waitForIdle()
        shot("learn-diagram-inline-dark")
    }

    @Test
    fun an_expandable_diagram_opens_full_screen_zooms_and_closes_back_to_the_screen() {
        showDiagramScreen("expandable")
        compose.onNodeWithText("Show diagram").performClick()
        compose.waitUntil(5_000) { compose.onAllNodesWithText("Close").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Zoom in").performClick()
        compose.onNodeWithText("Zoom out").performClick()
        compose.onNodeWithText("Fit to screen").performClick()
        compose.waitForIdle()
        wholeScreenShot("learn-diagram-open")
        compose.onNodeWithText("Close").performClick()
        compose.onNodeWithText("Show diagram").assertExists()
        compose.onNodeWithText("An RC filter").assertExists()
    }

    @Test
    fun a_diagram_that_cannot_be_fetched_says_so_and_keeps_its_description() {
        val images = LessonImages("s1", ImageLoader.Builder(compose.activity).okHttpClient(
            OkHttpClient.Builder().addInterceptor { throw java.io.IOException("offline") }.build(),
        ).build())
        show {
            CompositionLocalProvider(LocalLessonImages provides images) {
                LessonBody(screenWith("inline"), noActions)
            }
        }
        compose.waitUntil(5_000) {
            compose.onAllNodesWithText("This image could not be loaded.").fetchSemanticsNodes().isNotEmpty()
        }
    }

    // --- typeset maths ---

    private fun contractFile(name: String): String =
        checkNotNull(LearnerScreensTest::class.java.classLoader?.getResourceAsStream("learner-contract/$name")) {
            "missing $name"
        }.bufferedReader().use { it.readText() }

    private val inlineId = "0a1b2c3d-0000-4000-8000-000000000011"
    private val displayId = "0a1b2c3d-0000-4000-8000-000000000012"

    /** A loader that answers with the pictures the server drew for these two formulas. */
    private fun mathLoader(): ImageLoader {
        val inline = contractFile("math-inline.svg")
        val display = contractFile("math-display.svg")
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val svg = if (chain.request().url.toString().endsWith(inlineId)) inline else display
            Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK")
                .body(svg.toResponseBody("image/svg+xml".toMediaType())).build()
        }.build()
        return ImageLoader.Builder(compose.activity).okHttpClient(client)
            .components { add(SvgDecoder.Factory()) }.build()
    }

    // The sizes the server measured for these two (see math-inline.svg and math-display.svg).
    private val mathScreen = LessonUiState(
        title = "Attention",
        busy = false,
        step = ScreenStepDto(
            number = "1", index = 0, total = 4, canGoBack = false,
            blocks = listOf(
                ParagraphBlockDto(
                    listOf(
                        SpanDto("The key size "),
                        SpanDto("d_k", math = InlineMathDto("d sub k", inlineId, 1.099, 0.964, 0.179)),
                        SpanDto(" sits on the line of text, like the letters around it."),
                    ),
                ),
                FormulaBlockDto(
                    latex = "softmax", spoken = "softmax of z sub i",
                    assetId = displayId, widthEm = 9.5, heightEm = 2.5, depthEm = 1.1,
                ),
            ),
        ),
    )

    @Test
    fun maths_is_drawn_inline_and_on_its_own_line_from_the_servers_pictures() {
        val images = LessonImages("s1", mathLoader())
        show { CompositionLocalProvider(LocalLessonImages provides images) { LessonBody(mathScreen, noActions) } }
        compose.waitUntil(5_000) {
            // A symbol inside a sentence is part of the text's own node, so look in the unmerged tree.
            compose.onAllNodesWithContentDescription("d sub k", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty() &&
                compose.onAllNodesWithContentDescription("softmax of z sub i").fetchSemanticsNodes().isNotEmpty()
        }
        compose.waitForIdle()
        shot("learn-maths")
    }

    @Test
    fun maths_follows_the_dark_theme() {
        val images = LessonImages("s1", mathLoader())
        show(dark = true) { CompositionLocalProvider(LocalLessonImages provides images) { LessonBody(mathScreen, noActions) } }
        compose.waitUntil(5_000) {
            compose.onAllNodesWithContentDescription("softmax of z sub i").fetchSemanticsNodes().isNotEmpty()
        }
        compose.waitForIdle()
        shot("learn-maths-dark")
    }

    @Test
    fun maths_that_cannot_be_drawn_shows_its_latex_and_the_sentence_still_reads() {
        // No subject to fetch from: nothing can be drawn, so the LaTeX shows instead.
        show { LessonBody(mathScreen, noActions) }
        compose.onNodeWithText("softmax").assertExists()
        compose.onNodeWithText("d_k", substring = true).assertExists()
    }

    // --- "I need more on this" ---

    private fun helpScreen(
        notices: List<HelpNoticeDto> = emptyList(),
        addedInAnswer: String? = null,
        sources: List<ScreenSourceDto>? = null,
    ) = LessonUiState(
        title = "Embeddings", busy = false, subjectId = "s1", slug = "embeddings",
        step = ScreenStepDto(
            number = "5", index = 0, total = 4, canGoBack = false,
            blocks = listOf(ParagraphBlockDto(listOf(SpanDto("Numbers can be compared.")))),
            sources = sources, addedInAnswer = addedInAnswer, help = notices,
        ),
    )

    @Test
    fun asking_for_more_sends_the_note_and_the_form_closes() {
        val asked = mutableListOf<Pair<HelpTarget, String>>()
        val actions = LessonActions(
            next = {}, back = {}, carryOn = {}, pause = {}, resume = {}, answer = {}, afterFeedback = {},
            comment = { _, _ -> }, dismissComment = {}, toggleOpenBook = {},
            askForMore = { target, note -> asked += target to note }, dismissHelp = {},
            toOutline = {}, openLesson = {},
        )
        show { LessonBody(helpScreen(), actions) }
        compose.onNodeWithText("I need more on this").performScrollTo().performClick()
        compose.onNodeWithText("What would help? (optional)").performTextInput("Why numbers?")
        compose.onNodeWithText("Your AI reads this the next time it runs", substring = true).assertExists()
        shot("learn-help-form")
        compose.onNodeWithText("Ask my AI").performScrollTo().performClick()
        assertEquals(listOf<Pair<HelpTarget, String>>(HelpTarget.Screen("5") to "Why numbers?"), asked)
        compose.onNodeWithText("Ask my AI").assertDoesNotExist()
    }

    @Test
    fun a_request_that_is_waiting_says_so_and_offers_the_message_to_copy() {
        show { LessonBody(helpScreen(listOf(HelpNoticeDto("h1", "open"))), noActions) }
        compose.onNodeWithText("You asked for more on this.", substring = true).assertExists()
        compose.onNodeWithText("I need more on this").assertDoesNotExist()
        compose.onNodeWithText("Copy a message for my AI").performScrollTo().performClick()
        compose.onNodeWithText("Copied. Paste it to your AI.").assertExists()
    }

    @Test
    fun an_answered_request_says_where_the_answer_is_and_the_learner_may_ask_again() {
        show { LessonBody(helpScreen(listOf(HelpNoticeDto("h1", "answered", listOf("5.010")))), noActions) }
        compose.onNodeWithText("Answered: see 5.010 (the next screens).").assertExists()
        compose.onNodeWithText("I need more on this").assertExists()
    }

    @Test
    fun a_screen_added_in_answer_says_who_wrote_it_and_lists_its_sources_on_request() {
        val sources = listOf(ScreenSourceDto("The deck, card 6", "https://example.com/card6"), ScreenSourceDto("A book"))
        show { LessonBody(helpScreen(addedInAnswer = "ai", sources = sources), noActions) }
        compose.onNodeWithText("Added by your AI in answer to your question").assertExists()
        compose.onNodeWithText("The deck, card 6").assertDoesNotExist()
        compose.onNodeWithText("2 sources").performScrollTo().performClick()
        compose.onNodeWithText("The deck, card 6").assertExists()
        compose.onNodeWithText("• A book").assertExists()
        shot("learn-help-answer")
    }
}

private fun LearnerOutlineDtoWithDue(outline: LearnerOutlineDto, due: Int) =
    withDistinctIds(outline).copy(reviewsDue = due)

/** The contract files hold a placeholder for every id; a list needs each row's key to differ. */
private fun withDistinctIds(outline: LearnerOutlineDto) = outline.copy(
    modules = outline.modules.map { module ->
        module.copy(lessons = module.lessons.mapIndexed { index, lesson -> lesson.copy(id = "lesson-$index") })
    },
)
