package com.flashmd.ui.screens.learn

import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import android.content.Context
import coil.ImageLoader
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.flashmd.BuildConfig
import com.flashmd.di.LessonImageLoader
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

/**
 * Where a lesson's pictures come from. A stored diagram (`asset:<id>`) is fetched from the
 * subject's asset route with the learner's sign-in, through an image loader that uses the app's
 * own HTTP client; anything else uses the default loader.
 */
class LessonImages(val subjectId: String?, val imageLoader: ImageLoader?) {
    /** The address of a stored diagram, or null when the source is not one or there is no subject. */
    fun assetUrl(src: String): String? {
        val id = ASSET_SOURCE.matchEntire(src)?.groupValues?.get(1) ?: return null
        val subject = subjectId ?: return null
        return BuildConfig.API_BASE_URL.trimEnd('/') + "/api/subjects/$subject/assets/$id"
    }

    private companion object {
        val ASSET_SOURCE = Regex("""asset:([0-9a-fA-F-]{36})""")
    }
}

/** No subject and no loader: stored diagrams cannot be fetched and show their description instead. */
val LocalLessonImages = compositionLocalOf { LessonImages(null, null) }

@HiltViewModel
class LessonImagesViewModel @Inject constructor(@LessonImageLoader val imageLoader: ImageLoader) : ViewModel()

/** The images for one subject's lesson screens, using the app's signed-in loader. */
@Composable
fun rememberLessonImages(subjectId: String): LessonImages {
    val loader = hiltViewModel<LessonImagesViewModel>().imageLoader
    return remember(subjectId, loader) { LessonImages(subjectId, loader) }
}

/**
 * A request for a stored picture. It belongs to the learner's private course, so it is kept out of
 * the disk cache (the app keeps its own data encrypted); a web picture is not stored specially.
 */
fun storedImageRequest(context: Context, url: String): ImageRequest =
    ImageRequest.Builder(context).data(url).diskCachePolicy(CachePolicy.DISABLED).build()
