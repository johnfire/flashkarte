package com.flashmd.data.local

/**
 * Encrypts small secrets (access token, refresh cookie) before they touch disk,
 * using an AES-256-GCM key held in the hardware-backed Android Keystore. The key
 * never leaves the device and is not exportable, so values recovered from a
 * backup, device transfer, or rooted filesystem are useless off the device.
 *
 * Wire format: Base64(NO_WRAP) of [12-byte IV][GCM ciphertext+tag].
 */
object CryptoBox {
    private val secretBox = KeystoreSecretBox("flashkarte_session_key")

    fun encrypt(plaintext: String): String =
        secretBox.encrypt(plaintext.toByteArray(Charsets.UTF_8))

    /** Returns the plaintext, or null if the input is missing/corrupt/legacy. */
    fun decrypt(encoded: String): String? =
        secretBox.decrypt(encoded)?.toString(Charsets.UTF_8)
}
