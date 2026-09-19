package com.flashmd.data.remote.dto

import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * A screen (and a question's prompt, options and reasons) is a list of typed blocks the server has
 * already validated. The app draws each type natively. A block type this version does not know
 * arrives as [UnknownBlockDto] and is skipped, so a newer server never breaks an older app.
 */
@Serializable(with = BlockSerializer::class)
sealed interface BlockDto

/**
 * Typeset maths the server drew when the screen was saved: its picture, and its size in em. An
 * inline symbol also says how far it hangs below the text baseline, so it can sit on the line.
 */
@Serializable
data class InlineMathDto(
    val spoken: String? = null,
    val assetId: String? = null,
    val widthEm: Double? = null,
    val heightEm: Double? = null,
    val depthEm: Double? = null,
)

@Serializable
data class SpanDto(
    val text: String,
    val bold: Boolean = false,
    val italic: Boolean = false,
    val code: Boolean = false,
    /** When present, `text` is LaTeX for a symbol in the sentence. */
    val math: InlineMathDto? = null,
)

@Serializable
data class ParagraphBlockDto(val spans: List<SpanDto>) : BlockDto

@Serializable
data class ListBlockDto(val ordered: Boolean = false, val items: List<List<SpanDto>>) : BlockDto

@Serializable
data class CodeBlockDto(val language: String? = null, val text: String) : BlockDto

@Serializable
data class ImageBlockDto(
    val src: String? = null,
    val alt: String,
    val display: String = "inline",
    val caption: String? = null,
) : BlockDto

@Serializable
data class CalloutBlockDto(val tone: String = "note", val spans: List<SpanDto>) : BlockDto

@Serializable
data class FormulaBlockDto(
    val latex: String,
    val spoken: String? = null,
    val assetId: String? = null,
    val widthEm: Double? = null,
    val heightEm: Double? = null,
    val depthEm: Double? = null,
) : BlockDto

data class UnknownBlockDto(val type: String) : BlockDto

object BlockSerializer : JsonContentPolymorphicSerializer<BlockDto>(BlockDto::class) {
    override fun selectDeserializer(element: JsonElement): DeserializationStrategy<BlockDto> =
        when (element.jsonObject["type"]?.jsonPrimitive?.content) {
            "paragraph" -> ParagraphBlockDto.serializer()
            "list" -> ListBlockDto.serializer()
            "code" -> CodeBlockDto.serializer()
            "image" -> ImageBlockDto.serializer()
            "callout" -> CalloutBlockDto.serializer()
            "formula" -> FormulaBlockDto.serializer()
            else -> UnknownBlockSerializer
        }
}

/** Reads any block this version does not know, keeping only its type name. */
object UnknownBlockSerializer : kotlinx.serialization.KSerializer<BlockDto> {
    override val descriptor = JsonObject.serializer().descriptor
    override fun deserialize(decoder: kotlinx.serialization.encoding.Decoder): BlockDto {
        val element = (decoder as kotlinx.serialization.json.JsonDecoder).decodeJsonElement()
        return UnknownBlockDto(element.jsonObject["type"]?.jsonPrimitive?.content ?: "?")
    }
    override fun serialize(encoder: kotlinx.serialization.encoding.Encoder, value: BlockDto) =
        throw UnsupportedOperationException("Blocks are only ever read by the app")
}
