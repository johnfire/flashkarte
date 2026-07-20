package com.flashmd.di

import okhttp3.CertificatePinner

internal const val API_TLS_HOSTNAME = "flashkarte.christopherrehm.de"

// Let’s Encrypt's active ECDSA intermediates, valid through 2028-09-02.
// Keep both pins so routine CA rotation between YE1 and YE2 remains available.
private const val LETS_ENCRYPT_YE1_PIN = "sha256/brzvtCELCIZUo4sD/qPX0ccRtPsd3DY6RfmxpOU9oB4="
private const val LETS_ENCRYPT_YE2_PIN = "sha256/s/tdAOmUzd8syaTuqfgGvFcn6DzA5Cmb+Vby1ST+U3Y="
// ISRG Root YE (ECDSA trust anchor) — backup pin: survives
// Let's Encrypt intermediate rotation. Verified against the live chain
// 2026-07-20.
private const val ISRG_ROOT_YE_PIN = "sha256/sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w="

internal fun createApiCertificatePinner(): CertificatePinner =
    CertificatePinner.Builder()
        .add(
            API_TLS_HOSTNAME,
            LETS_ENCRYPT_YE1_PIN,
            LETS_ENCRYPT_YE2_PIN,
            ISRG_ROOT_YE_PIN,
        )
        .build()
