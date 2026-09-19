package com.flashmd.di

import android.content.Context
import coil.ImageLoader
import coil.decode.SvgDecoder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import javax.inject.Qualifier
import javax.inject.Singleton

/** The image loader for a lesson's pictures: it fetches through the app's own signed-in HTTP client. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class LessonImageLoader

@Module
@InstallIn(SingletonComponent::class)
object ImageModule {
    /**
     * Stored diagrams live behind the learner's sign-in, so they cannot go through Coil's default
     * client. The app's client attaches the token only to the flashkarte API host (never to another
     * host an image link points at) and pins that host's certificate.
     */
    @Provides
    @Singleton
    @LessonImageLoader
    fun provideLessonImageLoader(
        @ApplicationContext context: Context,
        client: OkHttpClient,
    ): ImageLoader =
        ImageLoader.Builder(context)
            .okHttpClient(client)
            .components { add(SvgDecoder.Factory()) }
            .build()
}
