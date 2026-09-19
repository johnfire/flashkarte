package com.flashmd.ui.screens.learn

import androidx.compose.ui.graphics.Color
import com.flashmd.data.remote.dto.FormulaBlockDto
import com.flashmd.data.remote.dto.InlineMathDto
import com.flashmd.data.remote.dto.SpanDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MathPictureTest {
    private val id = "0a1b2c3d-0000-4000-8000-000000000001"
    private val images = LessonImages("s1", null)
    private fun symbol(math: InlineMathDto?) = SpanDto("d_k", math = math)
    private val drawn = InlineMathDto(spoken = "d sub k", assetId = id, widthEm = 1.099, heightEm = 0.964, depthEm = 0.179)

    @Test
    fun `a symbol the server drew is shown as a picture`() {
        assertTrue(isDrawnMath(symbol(drawn), images))
    }

    @Test
    fun `a symbol is not drawn without its picture, its size, a subject, or a real asset id`() {
        assertFalse(isDrawnMath(SpanDto("plain"), images))
        assertFalse(isDrawnMath(symbol(InlineMathDto(spoken = "x")), images))
        assertFalse(isDrawnMath(symbol(drawn.copy(widthEm = null)), images))
        assertFalse(isDrawnMath(symbol(drawn.copy(heightEm = null)), images))
        assertFalse(isDrawnMath(symbol(drawn), LessonImages(null, null)))
        assertFalse(isDrawnMath(symbol(drawn.copy(assetId = "../../secret")), images))
    }

    @Test
    fun `the placeholder reaches above the baseline by the height less the depth, and never collapses`() {
        assertEquals(0.785, heightAboveBaseline(0.964, 0.179), 1e-9)
        assertEquals(1.131, heightAboveBaseline(1.131, null), 1e-9)
        assertEquals(0.1, heightAboveBaseline(0.2, 0.5), 1e-9)
    }

    @Test
    fun `a pictured symbol becomes inline content in its place in the sentence, others stay text`() {
        val spans = listOf(SpanDto("The key size "), symbol(drawn), SpanDto(" is "), SpanDto("x_i", math = InlineMathDto()))
        val text = spansToAnnotated(spans, Color.LightGray, pictured = setOf(1))
        assertEquals("The key size d_k is x_i", text.text)
        val inline = text.getStringAnnotations("androidx.compose.foundation.text.inlineContent", 0, text.length)
        assertEquals(1, inline.size)
        assertEquals(inlineMathId(1), inline.single().item)
        assertEquals(13, inline.single().start)
        // The symbol without a picture shows its LaTeX in code style.
        assertTrue(text.spanStyles.any { text.text.substring(it.start, it.end) == "x_i" })
    }

    @Test
    fun `a formula without a picture keeps its LaTeX and spoken text to show instead`() {
        val block = FormulaBlockDto(latex = "R = V / I", spoken = "R equals V over I")
        assertEquals("R = V / I", block.latex)
        assertEquals(null, block.assetId)
    }
}
