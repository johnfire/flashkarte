package com.flashmd.ui.screens.learn

import com.flashmd.BuildConfig
import com.flashmd.data.remote.dto.ImageBlockDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LessonImagesTest {
    private val id = "0a1b2c3d-0000-4000-8000-000000000001"
    private val base = BuildConfig.API_BASE_URL.trimEnd('/')
    private val images = LessonImages("s1", null)
    private fun block(src: String?) = ImageBlockDto(src = src, alt = "alt")

    @Test
    fun `a stored diagram is fetched from its subject's asset route`() {
        assertEquals("$base/api/subjects/s1/assets/$id", images.assetUrl("asset:$id"))
    }

    @Test
    fun `without a subject, or for anything that is not a stored diagram, there is no asset address`() {
        assertNull(LessonImages(null, null).assetUrl("asset:$id"))
        assertNull(images.assetUrl("https://example.com/a.svg"))
        assertNull(images.assetUrl("asset:not-an-id"))
        assertNull(images.assetUrl("asset:$id/../../x"))
    }

    @Test
    fun `a stored diagram needs the signed-in loader and stays out of the disk cache, a web picture does not`() {
        val stored = imageTarget(block("asset:$id"), images)
        assertNotNull(stored)
        assertTrue(stored!!.stored)

        val web = imageTarget(block("https://example.com/rc.svg"), images)
        assertEquals("https://example.com/rc.svg", web?.url)
        assertFalse(web!!.stored)

        val bundled = imageTarget(block("/schematics/rc.svg"), images)
        assertEquals("$base/schematics/rc.svg", bundled?.url)
        assertFalse(bundled!!.stored)
    }

    @Test
    fun `any other source is never fetched`() {
        assertNull(imageTarget(block("javascript:alert(1)"), images))
        assertNull(imageTarget(block("http://example.com/a.svg"), images))
        assertNull(imageTarget(block("data:image/svg+xml;base64,AAAA"), images))
        assertNull(imageTarget(block(null), images))
    }
}
