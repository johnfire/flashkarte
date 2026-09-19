package com.flashmd.ui.screens.learn

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.foundation.text.InlineTextContent
import androidx.compose.ui.text.Placeholder
import androidx.compose.ui.text.PlaceholderVerticalAlign
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.flashmd.data.remote.dto.FormulaBlockDto
import com.flashmd.data.remote.dto.SpanDto

/**
 * Typeset maths. The server drew each formula once, when the screen was saved, so the app only
 * shows a picture, sized in em from the numbers the server measured. The picture is one colour
 * that the app tints with the text colour, so it follows light and dark themes. Until it arrives
 * (or if it cannot), the LaTeX shows as plain text: readable, never blank.
 */

private const val DISPLAY_SCALE = 1.15f

/** Whether a span is maths the server drew and this device can fetch. */
internal fun isDrawnMath(span: SpanDto, images: LessonImages): Boolean {
    val math = span.math ?: return false
    return math.assetId != null && math.widthEm != null && math.heightEm != null &&
        images.assetUrl("asset:${math.assetId}") != null
}

/** The id of the inline content standing in for the span at [index]. */
internal fun inlineMathId(index: Int) = "math-$index"

/** How far above the baseline the placeholder reaches: the picture's height less what hangs below. */
internal fun heightAboveBaseline(heightEm: Double, depthEm: Double?): Double =
    (heightEm - (depthEm ?: 0.0)).coerceAtLeast(0.1)

@Composable
private fun emToDp(em: Double, fontSize: TextUnit): Dp =
    with(LocalDensity.current) { (em.toFloat() * fontSize.value).sp.toDp() }

@Composable
private fun MathImage(url: String, spoken: String, modifier: Modifier, tint: Color) {
    val context = LocalContext.current
    val images = LocalLessonImages.current
    val request = remember(url) { storedImageRequest(context, url) }
    AsyncImage(
        model = request,
        imageLoader = images.imageLoader ?: coil.Coil.imageLoader(context),
        contentDescription = spoken,
        colorFilter = ColorFilter.tint(tint),
        contentScale = ContentScale.Fit,
        modifier = modifier,
    )
}

/**
 * The pictures for the maths in a sentence, keyed by [inlineMathId]. Each is a placeholder that
 * sits above the baseline by (height - depth) and lets the picture hang below it by the depth, so
 * a symbol like d_k lines up with the text around it instead of riding high.
 */
@Composable
internal fun inlineMathContent(
    spans: List<SpanDto>,
    fontSize: TextUnit,
    images: LessonImages,
): Map<String, InlineTextContent> {
    val tint = LocalContentColor.current
    val content = mutableMapOf<String, InlineTextContent>()
    spans.forEachIndexed { index, span ->
        if (!isDrawnMath(span, images)) return@forEachIndexed
        val math = span.math!!
        val width = math.widthEm!!
        val height = math.heightEm!!
        content[inlineMathId(index)] = InlineTextContent(
            Placeholder(
                width = width.em,
                height = heightAboveBaseline(height, math.depthEm).em,
                placeholderVerticalAlign = PlaceholderVerticalAlign.AboveBaseline,
            ),
        ) {
            MathImage(
                url = images.assetUrl("asset:${math.assetId}")!!,
                spoken = math.spoken ?: span.text,
                tint = tint,
                modifier = Modifier
                    // The picture is taller than the placeholder by the depth: let it hang down.
                    .wrapContentSize(align = Alignment.TopStart, unbounded = true)
                    .requiredSize(emToDp(width, fontSize), emToDp(height, fontSize)),
            )
        }
    }
    return content
}

/** A formula on its own line. A wide one scrolls sideways rather than shrink. */
@Composable
fun DisplayFormula(block: FormulaBlockDto, modifier: Modifier = Modifier) {
    val images = LocalLessonImages.current
    val url = block.assetId?.let { images.assetUrl("asset:$it") }
    val spoken = block.spoken ?: block.latex
    if (url == null || block.widthEm == null || block.heightEm == null) {
        Text(
            block.latex,
            fontFamily = FontFamily.Monospace,
            modifier = modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
                .semantics { contentDescription = spoken },
        )
        return
    }
    val fontSize = MaterialTheme.typography.bodyLarge.fontSize * DISPLAY_SCALE
    Box(
        modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        MathImage(
            url = url,
            spoken = spoken,
            tint = LocalContentColor.current,
            modifier = Modifier.requiredSize(emToDp(block.widthEm, fontSize), emToDp(block.heightEm, fontSize)),
        )
    }
}
