package com.flashmd.ui.screens.learn

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest
import com.flashmd.R
import com.flashmd.data.remote.dto.ImageBlockDto
import com.flashmd.ui.components.resolveImageUrl

private val PAPER = Color.White
private const val MAX_ZOOM = 5f
private const val ZOOM_STEP = 1.5f

/** The address an image block's picture is fetched from, and whether it needs the signed-in loader. */
internal class ImageTarget(val url: String, val stored: Boolean)

internal fun imageTarget(block: ImageBlockDto, images: LessonImages): ImageTarget? {
    val src = block.src ?: return null
    images.assetUrl(src)?.let { return ImageTarget(it, stored = true) }
    return if (src.startsWith("https://") || src.startsWith("/")) ImageTarget(resolveImageUrl(src), stored = false) else null
}

/**
 * A lesson's picture, on a white surface in light and dark mode alike so a diagram drawn with dark
 * lines stays readable. An expandable diagram opens full-screen from a "Show diagram" button, with
 * pinch and buttons to zoom, and closing returns to the same place on the screen.
 */
@Composable
fun LessonImageBlock(block: ImageBlockDto, modifier: Modifier = Modifier) {
    val images = LocalLessonImages.current
    val target = imageTarget(block, images)
    val description = block.caption ?: block.alt
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (target == null) {
            ImageUnavailable(block.alt)
        } else if (block.display == "expandable") {
            ExpandableImage(target, block, images, description)
        } else {
            Picture(target, block.alt, images, Modifier.fillMaxWidth().heightIn(max = 360.dp))
            block.caption?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun ImageUnavailable(alt: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.learn_image_unavailable), color = MaterialTheme.colorScheme.error)
        Text(alt, style = MaterialTheme.typography.bodyMedium)
    }
}

/** The picture itself: fetched (with the sign-in for a stored diagram), with a spinner, and a message if it fails. */
@Composable
private fun Picture(target: ImageTarget, alt: String, images: LessonImages, modifier: Modifier, scale: Modifier = Modifier) {
    val context = LocalContext.current
    val request = remember(target) {
        if (target.stored) storedImageRequest(context, target.url)
        else ImageRequest.Builder(context).data(target.url).build()
    }
    Box(modifier.clip(RoundedCornerShape(8.dp)).background(PAPER), contentAlignment = Alignment.Center) {
        SubcomposeAsyncImage(
            model = request,
            imageLoader = if (target.stored) images.imageLoader ?: coil.Coil.imageLoader(context) else coil.Coil.imageLoader(context),
            contentDescription = alt,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxWidth().then(scale),
            loading = { Box(Modifier.padding(24.dp), Alignment.Center) { CircularProgressIndicator() } },
            error = { Box(Modifier.padding(16.dp)) { Text(stringResource(R.string.learn_image_unavailable), color = Color.Black) } },
        )
    }
}

@Composable
private fun ExpandableImage(target: ImageTarget, block: ImageBlockDto, images: LessonImages, description: String) {
    var open by rememberSaveable(target.url) { mutableStateOf(false) }
    OutlinedButton(onClick = { open = true }) { Text(stringResource(R.string.learn_show_diagram)) }
    Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    if (open) DiagramDialog(target, block.alt, images) { open = false }
}

/** Full-screen, with pinch and pan, plus buttons for anyone who cannot pinch. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DiagramDialog(target: ImageTarget, alt: String, images: LessonImages, onClose: () -> Unit) {
    var zoom by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    val transform = rememberTransformableState { change, pan, _ ->
        zoom = (zoom * change).coerceIn(1f, MAX_ZOOM)
        offset = if (zoom == 1f) Offset.Zero else offset + pan
    }
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = PAPER) {
            Column(Modifier.fillMaxSize()) {
                Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        Button(onClick = onClose) { Text(stringResource(R.string.learn_close_diagram)) }
                    }
                    // Wraps on a narrow screen instead of squeezing the labels.
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { zoom = (zoom * ZOOM_STEP).coerceAtMost(MAX_ZOOM) }) { Text(stringResource(R.string.learn_zoom_in)) }
                        OutlinedButton(onClick = {
                            zoom = (zoom / ZOOM_STEP).coerceAtLeast(1f)
                            if (zoom == 1f) offset = Offset.Zero
                        }) { Text(stringResource(R.string.learn_zoom_out)) }
                        OutlinedButton(onClick = { zoom = 1f; offset = Offset.Zero }) { Text(stringResource(R.string.learn_zoom_fit)) }
                    }
                }
                Box(
                    Modifier.weight(1f).fillMaxWidth().clip(RoundedCornerShape(0.dp)).transformable(transform).semantics { contentDescription = alt },
                    contentAlignment = Alignment.Center,
                ) {
                    Picture(
                        target, alt, images, Modifier.fillMaxSize(),
                        scale = Modifier.graphicsLayer(scaleX = zoom, scaleY = zoom, translationX = offset.x, translationY = offset.y),
                    )
                }
            }
        }
    }
}
