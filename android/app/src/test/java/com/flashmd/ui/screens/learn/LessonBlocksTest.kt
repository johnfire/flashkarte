package com.flashmd.ui.screens.learn

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import com.flashmd.data.remote.dto.SpanDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LessonBlocksTest {
    private val tint = Color(0xFFEEEEEE)

    @Test
    fun `spans keep their text in order and carry bold, italic and code`() {
        val text = spansToAnnotated(
            listOf(
                SpanDto("A "), SpanDto("token", bold = true), SpanDto(" is "),
                SpanDto("a piece", italic = true), SpanDto(" like "), SpanDto("cat", code = true),
            ),
            tint,
        )
        assertEquals("A token is a piece like cat", text.text)
        val byText = text.spanStyles.associate { text.text.substring(it.start, it.end) to it.item }
        assertEquals(FontWeight.Bold, byText["token"]?.fontWeight)
        assertEquals(FontStyle.Italic, byText["a piece"]?.fontStyle)
        assertEquals(FontFamily.Monospace, byText["cat"]?.fontFamily)
        assertEquals(tint, byText["cat"]?.background)
        assertNull(byText["A "]?.fontWeight)
    }

    @Test
    fun `markup in text stays text`() {
        val text = spansToAnnotated(listOf(SpanDto("<b>not bold</b> **nor this**")), tint)
        assertEquals("<b>not bold</b> **nor this**", text.text)
    }
}
