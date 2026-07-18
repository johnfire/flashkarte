package com.flashmd.db

import com.flashmd.data.local.db.DatabasePassphraseStore
import com.flashmd.data.local.db.SecretCipher
import com.flashmd.data.local.db.SecretValueStore
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class DatabasePassphraseStoreTest {
    private val values = MemoryValues()
    private val cipher = ReversingCipher()
    private val generated = ByteArray(32) { it.toByte() }
    private val store = DatabasePassphraseStore(values, cipher) { generated.copyOf() }

    @Test
    fun createsAndWrapsRandomPassphraseForNewDatabase() {
        val passphrase = store.getOrCreate(databaseExists = false)

        assertArrayEquals(generated, passphrase)
        assertEquals(cipher.encrypt(generated), values.value)
    }

    @Test
    fun returnsPreviouslyWrappedPassphrase() {
        values.value = cipher.encrypt(generated)

        assertArrayEquals(generated, store.getOrCreate(databaseExists = true))
    }

    @Test
    fun refusesToReplaceMissingKeyForExistingDatabase() {
        assertThrows(IllegalStateException::class.java) {
            store.getOrCreate(databaseExists = true)
        }
    }

    @Test
    fun refusesToReplaceCorruptWrappedPassphrase() {
        values.value = "corrupt"

        assertThrows(IllegalStateException::class.java) {
            store.getOrCreate(databaseExists = true)
        }
    }

    private class MemoryValues : SecretValueStore {
        var value: String? = null
        override fun read(): String? = value
        override fun write(value: String): Boolean {
            this.value = value
            return true
        }
    }

    private class ReversingCipher : SecretCipher {
        override fun encrypt(plaintext: ByteArray): String = plaintext.reversedArray().decodeToString()
        override fun decrypt(encoded: String): ByteArray? =
            if (encoded == "corrupt") null else encoded.encodeToByteArray().reversedArray()
    }
}
