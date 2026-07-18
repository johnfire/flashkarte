package com.flashmd.di

import io.mockk.every
import io.mockk.mockk
import okhttp3.CertificatePinner
import org.junit.Assert.assertThrows
import org.junit.Test
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PublicKey
import java.security.cert.X509Certificate
import java.security.spec.X509EncodedKeySpec
import java.util.Base64
import javax.net.ssl.SSLPeerUnverifiedException

class ApiCertificatePinningTest {

    @Test
    fun `accepts the observed YE1 intermediate public key`() {
        val certificatePinner = createApiCertificatePinner()
        val certificate = certificateWithPublicKey(decodeEcPublicKey(YE1_PUBLIC_KEY_DER))

        certificatePinner.check(API_TLS_HOSTNAME, listOf(certificate))
    }

    @Test
    fun `accepts the backup YE2 intermediate public key`() {
        val certificatePinner = createApiCertificatePinner()
        val certificate = certificateWithPublicKey(decodeEcPublicKey(YE2_PUBLIC_KEY_DER))

        certificatePinner.check(API_TLS_HOSTNAME, listOf(certificate))
    }

    @Test
    fun `rejects an unrelated certificate public key`() {
        val certificatePinner = createApiCertificatePinner()
        val unrelatedPublicKey = KeyPairGenerator.getInstance("EC").run {
            initialize(384)
            generateKeyPair().public
        }

        assertThrows(SSLPeerUnverifiedException::class.java) {
            certificatePinner.check(
                API_TLS_HOSTNAME,
                listOf(certificateWithPublicKey(unrelatedPublicKey)),
            )
        }
    }

    private fun decodeEcPublicKey(encodedKey: String): PublicKey {
        val keyBytes = Base64.getDecoder().decode(encodedKey)
        return KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(keyBytes))
    }

    private fun certificateWithPublicKey(publicKey: PublicKey): X509Certificate =
        mockk(relaxed = true) {
            every { this@mockk.publicKey } returns publicKey
        }

    private companion object {
        const val YE1_PUBLIC_KEY_DER =
            "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEB2VQdf5oppWtoX0rq8pUnIzzGWjiVy8/" +
                "zZwHNrMpZvFg8oVPQnKfswEkIub0sBhiY0hpJZA/X3T0fBqcgyDiIwhH6527f7/" +
                "mUhDyyxBm2jOhHHA2ze6fcbXiJtgL3/q8"
        const val YE2_PUBLIC_KEY_DER =
            "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEcZq0M5HWxBC9zKl7d3SULbWHOO2sZHQ0" +
                "x7neUz6jNs+bkg+XJpNFqx5Vl755b6gS6ogd+JJbsSG5jMgIqt/2A+nvNP71dufS" +
                "vF0CHYxV5aGDmtJiFO9X+x0NPT72A5cP"
    }
}
