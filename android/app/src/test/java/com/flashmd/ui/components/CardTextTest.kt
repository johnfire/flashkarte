package com.flashmd.ui.components

import org.junit.Assert.assertEquals
import org.junit.Test

// Mirror of packages/web/src/components/CardText.test.tsx's splitCardText
// coverage — the two clients must agree on which `![alt](url)` spans in a
// card's front/back count as an image, since the same cards are authored once
// and studied on both platforms.
class CardTextTest {
    @Test fun `plain text with no image markup is a single text segment`() {
        val segments = splitCardText("What is 2+2?")
        assertEquals(listOf(CardTextSegment.Text("What is 2+2?")), segments)
    }

    @Test fun `an image alone parses to a single image segment`() {
        val segments = splitCardText("![RC lowpass filter](/schematics/ch1-rc-lowpass.svg)")
        assertEquals(
            listOf(CardTextSegment.Image("RC lowpass filter", "/schematics/ch1-rc-lowpass.svg")),
            segments,
        )
    }

    @Test fun `text before and after an image splits into three segments`() {
        val segments = splitCardText("See below:\n![diagram](/schematics/x.svg)\nThat's it.")
        assertEquals(
            listOf(
                CardTextSegment.Text("See below:\n"),
                CardTextSegment.Image("diagram", "/schematics/x.svg"),
                CardTextSegment.Text("\nThat's it."),
            ),
            segments,
        )
    }

    @Test fun `an https URL is treated as an image`() {
        val segments = splitCardText("![alt](https://example.com/pic.png)")
        assertEquals(
            listOf(CardTextSegment.Image("alt", "https://example.com/pic.png")),
            segments,
        )
    }

    @Test fun `a non-https non-root-relative scheme stays literal text`() {
        val text = "![alt](javascript:alert(1))"
        assertEquals(listOf(CardTextSegment.Text(text)), splitCardText(text))
    }

    @Test fun `an http (not https) URL stays literal text`() {
        val text = "![alt](http://example.com/pic.png)"
        assertEquals(listOf(CardTextSegment.Text(text)), splitCardText(text))
    }

    @Test fun `empty alt text is allowed`() {
        val segments = splitCardText("![](/schematics/x.svg)")
        assertEquals(listOf(CardTextSegment.Image("", "/schematics/x.svg")), segments)
    }

    @Test fun `multiple images in one card each become their own segment`() {
        val segments = splitCardText("![a](/schematics/a.svg)![b](/schematics/b.svg)")
        assertEquals(
            listOf(
                CardTextSegment.Image("a", "/schematics/a.svg"),
                CardTextSegment.Image("b", "/schematics/b.svg"),
            ),
            segments,
        )
    }

    @Test fun `resolveImageUrl leaves an absolute https URL unchanged`() {
        assertEquals(
            "https://example.com/pic.png",
            resolveImageUrl("https://example.com/pic.png"),
        )
    }

    @Test fun `resolveImageUrl resolves a root-relative path against the API host`() {
        // BuildConfig.API_BASE_URL is "https://flashkarte.christopherrehm.de/" in
        // every build variant (see app/build.gradle.kts) — trailing slash trimmed
        // so the join never doubles up.
        assertEquals(
            "https://flashkarte.christopherrehm.de/schematics/ch1-rc-lowpass.svg",
            resolveImageUrl("/schematics/ch1-rc-lowpass.svg"),
        )
    }
}
