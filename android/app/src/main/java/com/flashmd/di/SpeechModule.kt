package com.flashmd.di

import com.flashmd.data.speech.AndroidSpeechPlayer
import com.flashmd.data.speech.SpeechPlayer
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class SpeechModule {

    @Binds
    @Singleton
    abstract fun bindSpeechPlayer(impl: AndroidSpeechPlayer): SpeechPlayer
}
