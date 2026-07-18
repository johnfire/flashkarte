package com.flashmd.data.local.db

import android.content.Context
import com.flashmd.data.local.KeystoreSecretBox
import java.security.SecureRandom

internal interface SecretCipher {
    fun encrypt(plaintext: ByteArray): String
    fun decrypt(encoded: String): ByteArray?
}

internal interface SecretValueStore {
    fun read(): String?
    fun write(value: String): Boolean
}

internal class DatabasePassphraseStore(
    private val values: SecretValueStore,
    private val cipher: SecretCipher,
    private val randomBytes: (Int) -> ByteArray,
) {
    fun getOrCreate(databaseExists: Boolean): ByteArray {
        val stored = values.read()
        if (stored != null) {
            return cipher.decrypt(stored)
                ?: error("The encrypted database passphrase cannot be recovered")
        }
        check(!databaseExists) { "The encrypted database passphrase is missing" }
        return randomBytes(PASSPHRASE_BYTES).also {
            check(values.write(cipher.encrypt(it))) {
                "The encrypted database passphrase could not be stored"
            }
        }
    }

    companion object {
        private const val PASSPHRASE_BYTES = 32

        fun create(context: Context): DatabasePassphraseStore {
            val preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            val values = object : SecretValueStore {
                override fun read(): String? = preferences.getString(PASSPHRASE, null)
                override fun write(value: String): Boolean =
                    preferences.edit().putString(PASSPHRASE, value).commit()
            }
            return DatabasePassphraseStore(values, KeystoreSecretBox(KEY_ALIAS)) { size ->
                ByteArray(size).also(SecureRandom()::nextBytes)
            }
        }

        private const val PREFERENCES = "encrypted_database_secrets"
        private const val PASSPHRASE = "wrapped_passphrase"
        private const val KEY_ALIAS = "flashkarte_database_key"
    }
}
