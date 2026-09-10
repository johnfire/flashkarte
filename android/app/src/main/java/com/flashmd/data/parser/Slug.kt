package com.flashmd.data.parser

import java.text.Normalizer

/**
 * Mirror of `slugify` in packages/shared/src/slug.ts — keep in sync.
 *
 * Used for the polysemy `word` grouping key, which Android computes offline while the
 * server computes it on upload. If the two ever disagree, a word's senses stop grouping
 * on one client only, so the parity test in SlugTest is part of the contract (the same
 * discipline the SM-2 easiness rounding drift taught us).
 *
 * `\p{Mn}` stands in for JS `\p{Diacritic}`: after NFKD the accents this app sees
 * (German umlauts, Spanish/French accents) are all combining marks.
 */
fun slugify(input: String): String {
    val slug = Normalizer.normalize(input, Normalizer.Form.NFKD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()
        .replace(Regex("[^a-z0-9]+"), "-")
        .replace(Regex("^-+"), "")
        .take(60)
        .replace(Regex("-+$"), "")
    return slug.ifEmpty { "deck" }
}
