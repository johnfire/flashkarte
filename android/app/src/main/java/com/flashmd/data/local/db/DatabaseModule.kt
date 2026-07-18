package com.flashmd.data.local.db

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import com.flashmd.db.FlashkarteDb
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
    fun provideDriver(@ApplicationContext context: Context): SqlDriver =
        EncryptedDatabaseProvider.create(context)

    @Provides
    @Singleton
    fun provideDatabase(driver: SqlDriver): FlashkarteDb = FlashkarteDb(driver)
}
