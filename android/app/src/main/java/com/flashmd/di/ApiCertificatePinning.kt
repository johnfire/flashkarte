package com.flashmd.di

import okhttp3.CertificatePinner

internal const val API_TLS_HOSTNAME = "flashkarte.christopherrehm.de"

// Let’s Encrypt's active ECDSA intermediates, valid through 2028-09-02.
// Keep both pins so routine CA rotation between YE1 and YE2 remains available.
private const val LETS_ENCRYPT_YE1_PIN = "sha256/brzvtCELCIZUo4sD/qPX0ccRtPsd3DY6RfmxpOU9oB4="
private const val LETS_ENCRYPT_YE2_PIN = "sha256/s/tdAOmUzd8syaTuqfgGvFcn6DzA5Cmb+Vby1ST+U3Y="

internal fun createApiCertificatePinner(): CertificatePinner =
    CertificatePinner.Builder()
        .add(
            API_TLS_HOSTNAME,
            LETS_ENCRYPT_YE1_PIN,
            LETS_ENCRYPT_YE2_PIN,
        )
        .build()
