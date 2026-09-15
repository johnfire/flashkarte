package com.flashmd.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.flashmd.BuildConfig

/**
 * Card front/back text can embed `![alt](url)` image markdown (Spec 03's
 * schematic diagrams) alongside plain text — mirrors the web client's
 * CardText.tsx exactly so a card authored on one platform renders the same
 * way on both. `url` must be an `https://` link or a root-relative path
 * (schematics ship under `/schematics/`, served by the same host the app
 * already talks to); any other scheme is left as literal text, never
 * fetched.
 */
private val IMAGE_PATTERN = Regex("""!\[([^\]]*)\]\(((?:https://|/)[^\s)]+)\)""")

internal sealed class CardTextSegment {
    data class Text(val value: String) : CardTextSegment()
    data class Image(val alt: String, val src: String) : CardTextSegment()
}

internal fun splitCardText(text: String): List<CardTextSegment> {
    val segments = mutableListOf<CardTextSegment>()
    var lastIndex = 0
    for (match in IMAGE_PATTERN.findAll(text)) {
        val range = match.range
        if (range.first > lastIndex) {
            segments.add(CardTextSegment.Text(text.substring(lastIndex, range.first)))
        }
        segments.add(
            CardTextSegment.Image(alt = match.groupValues[1], src = match.groupValues[2]),
        )
        lastIndex = range.last + 1
    }
    if (lastIndex < text.length) {
        segments.add(CardTextSegment.Text(text.substring(lastIndex)))
    }
    return segments
}

/**
 * Resolves a root-relative image path (e.g. `/schematics/foo.svg`) against
 * the API host; an already-absolute `https://` URL passes through unchanged.
 */
internal fun resolveImageUrl(src: String): String =
    if (src.startsWith("https://")) src else BuildConfig.API_BASE_URL.trimEnd('/') + src

@Composable
fun CardText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = LocalTextStyle.current,
    textAlign: TextAlign? = null,
    fontWeight: FontWeight? = null,
    color: Color = LocalContentColor.current,
) {
    val segments = remember(text) { splitCardText(text) }
    Column(modifier.fillMaxWidth()) {
        segments.forEach { segment ->
            when (segment) {
                is CardTextSegment.Text -> if (segment.value.isNotEmpty()) {
                    Text(
                        segment.value,
                        style = style,
                        textAlign = textAlign,
                        fontWeight = fontWeight,
                        color = color,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                is CardTextSegment.Image -> AsyncImage(
                    model = resolveImageUrl(segment.src),
                    contentDescription = segment.alt,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth().heightIn(max = 240.dp).padding(vertical = 8.dp),
                )
            }
        }
    }
}
