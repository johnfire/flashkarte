package com.flashmd.di

import android.content.Context
import androidx.room.Room
import com.flashmd.data.db.FlashMdDatabase
import com.flashmd.data.db.daos.CardDao
import com.flashmd.data.db.daos.DeckDao
import com.flashmd.data.db.daos.ProgressDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): FlashMdDatabase =
        Room.databaseBuilder(context, FlashMdDatabase::class.java, "flashmd.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideDeckDao(db: FlashMdDatabase): DeckDao = db.deckDao()
    @Provides fun provideCardDao(db: FlashMdDatabase): CardDao = db.cardDao()
    @Provides fun provideProgressDao(db: FlashMdDatabase): ProgressDao = db.progressDao()
}
