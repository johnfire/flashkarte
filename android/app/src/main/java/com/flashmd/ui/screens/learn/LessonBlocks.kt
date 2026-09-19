package com.flashmd.ui.screens.learn

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.foundation.text.appendInlineContent
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.flashmd.data.remote.dto.BlockDto
import com.flashmd.data.remote.dto.CalloutBlockDto
import com.flashmd.data.remote.dto.CodeBlockDto
import com.flashmd.data.remote.dto.FormulaBlockDto
import com.flashmd.data.remote.dto.ImageBlockDto
import com.flashmd.data.remote.dto.ListBlockDto
import com.flashmd.data.remote.dto.ParagraphBlockDto
import com.flashmd.data.remote.dto.SpanDto
import com.flashmd.data.remote.dto.UnknownBlockDto

/**
 * Draws a screen's blocks natively (no markdown). Images and formulas are placeholders until those
 * slices land: an image shows its description, a formula shows its LaTeX and is read out as its
 * spoken text. A block type this version does not know is skipped.
 */
@Composable
fun LessonBlocks(blocks: List<BlockDto>, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        blocks.forEach { block -> LessonBlock(block) }
    }
}

/**
 * Spans as one styled string. Code gets a monospace face and a tinted background; a symbol the
 * server drew as a picture becomes inline content at its position (see MathPicture.kt), and one it
 * did not draw shows its LaTeX as code.
 */
internal fun spansToAnnotated(
    spans: List<SpanDto>,
    codeBackground: androidx.compose.ui.graphics.Color,
    pictured: Set<Int> = emptySet(),
): AnnotatedString =
    buildAnnotatedString {
        spans.forEachIndexed { index, span ->
            if (index in pictured) {
                appendInlineContent(inlineMathId(index), span.text)
                return@forEachIndexed
            }
            val style = SpanStyle(
                fontWeight = if (span.bold) FontWeight.Bold else null,
                fontStyle = if (span.italic) FontStyle.Italic else null,
                fontFamily = if (span.code || span.math != null) FontFamily.Monospace else null,
                background = if (span.code || span.math != null) codeBackground else androidx.compose.ui.graphics.Color.Unspecified,
            )
            withStyle(style) { append(span.text) }
        }
    }

@Composable
private fun SpanText(spans: List<SpanDto>, modifier: Modifier = Modifier) {
    val images = LocalLessonImages.current
    val style = MaterialTheme.typography.bodyLarge
    val pictured = remember(spans, images) {
        spans.indices.filter { isDrawnMath(spans[it], images) }.toSet()
    }
    Text(
        spansToAnnotated(spans, MaterialTheme.colorScheme.surfaceVariant, pictured),
        inlineContent = inlineMathContent(spans, style.fontSize, images),
        style = style,
        modifier = modifier,
    )
}

@Composable
private fun LessonBlock(block: BlockDto) {
    when (block) {
        is ParagraphBlockDto -> SpanText(block.spans)
        is ListBlockDto -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            block.items.forEachIndexed { index, item ->
                Row {
                    Text(if (block.ordered) "${index + 1}." else "•", modifier = Modifier.width(24.dp))
                    SpanText(item, Modifier.weight(1f))
                }
            }
        }
        is CodeBlockDto -> Text(
            block.text,
            fontFamily = FontFamily.Monospace,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .horizontalScroll(rememberScrollState())
                .padding(12.dp),
        )
        is CalloutBlockDto -> SpanText(
            block.spans,
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.secondaryContainer)
                .padding(12.dp),
        )
        is ImageBlockDto -> LessonImageBlock(block)
        is FormulaBlockDto -> DisplayFormula(block)
        is UnknownBlockDto -> Unit
    }
}
