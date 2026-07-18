package com.flashmd.data.local.db

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import com.flashmd.db.FlashkarteDb
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import java.io.File

internal object EncryptedDatabaseProvider {
    private const val LEGACY_NAME = "flashkarte.db"
    private const val DATABASE_NAME = "flashkarte-encrypted.db"
    private const val MIGRATION_NAME = "flashkarte-encrypted-migrating.db"

    fun create(context: Context): SqlDriver {
        System.loadLibrary("sqlcipher")
        val encryptedFile = context.getDatabasePath(DATABASE_NAME)
        val passphrase = DatabasePassphraseStore.create(context)
            .getOrCreate(encryptedFile.exists())
        migrateLegacyDatabase(context, passphrase, encryptedFile)
        return encryptedDriver(context, DATABASE_NAME, passphrase)
    }

    private fun migrateLegacyDatabase(
        context: Context,
        passphrase: ByteArray,
        encryptedFile: File,
    ) {
        val legacyFile = context.getDatabasePath(LEGACY_NAME)
        if (encryptedFile.exists() || !legacyFile.exists()) return

        deleteDatabaseFiles(context, MIGRATION_NAME)
        val sourceDriver = AndroidSqliteDriver(FlashkarteDb.Schema, context, LEGACY_NAME)
        val targetDriver = encryptedDriver(context, MIGRATION_NAME, passphrase)
        try {
            PlaintextDatabaseMigrator.migrate(
                FlashkarteDb(sourceDriver),
                FlashkarteDb(targetDriver),
            )
        } finally {
            targetDriver.close()
            sourceDriver.close()
        }
        val migrationFile = context.getDatabasePath(MIGRATION_NAME)
        check(migrationFile.renameTo(encryptedFile)) { "Could not activate encrypted database" }
        deleteDatabaseFiles(context, LEGACY_NAME)
    }

    private fun encryptedDriver(
        context: Context,
        name: String,
        passphrase: ByteArray,
    ): SqlDriver = AndroidSqliteDriver(
        FlashkarteDb.Schema,
        context,
        name,
        SupportOpenHelperFactory(passphrase),
    )

    private fun deleteDatabaseFiles(context: Context, name: String) {
        val file = context.getDatabasePath(name)
        listOf(
            file,
            File("${file.path}-wal"),
            File("${file.path}-shm"),
            File("${file.path}-journal"),
        )
            .forEach { candidate -> check(!candidate.exists() || candidate.delete()) }
    }
}
