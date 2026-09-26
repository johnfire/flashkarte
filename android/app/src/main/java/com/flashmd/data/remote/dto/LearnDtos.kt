package com.flashmd.data.remote.dto

import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonContentPolymorphicSerializer
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

// The learner API (/api/subjects/:id/learn/...). The server holds each learner's session and the
// rules; the app only sends what the learner did and draws the step it gets back.

@Serializable
data class LearnSubjectDto(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("concept_count") val conceptCount: Int = 0,
    @SerialName("reference_number") val referenceNumber: Int? = null,
)

@Serializable
data class OutlineUnlockDto(
    val lessonId: String,
    val slug: String,
    val title: String,
    val reason: String = "",
    val passed: Boolean = false,
)

@Serializable
data class FirstTryResultDto(
    @SerialName("first_try_right") val firstTryRight: Int,
    val total: Int,
)

@Serializable
data class LearnerLessonDto(
    val id: String,
    val slug: String,
    val title: String,
    val summary: String = "",
    val stage: String? = null,
    val covers: List<String> = emptyList(),
    /** locked, available, in_progress or passed. */
    val access: String,
    val paused: Boolean = false,
    val answered: Int? = null,
    val result: FirstTryResultDto? = null,
    val unlocksAfter: List<OutlineUnlockDto> = emptyList(),
)

@Serializable
data class LearnerModuleDto(
    val id: String? = null,
    val title: String? = null,
    val lessons: List<LearnerLessonDto> = emptyList(),
)

@Serializable
data class LearnerOutlineDto(
    @SerialName("subject_id") val subjectId: String,
    @SerialName("subject_title") val subjectTitle: String,
    @SerialName("reviews_due") val reviewsDue: Int = 0,
    val modules: List<LearnerModuleDto> = emptyList(),
)

@Serializable
data class QuestionOptionDto(val blocks: List<BlockDto>)

/** A learner's "I need more on this" request as the server reports it back. */
@Serializable
data class HelpNoticeDto(
    val id: String,
    /** "open" (waiting for the AI) or "answered". */
    val status: String,
    /** The screens added in answer, in order. */
    val answers: List<String> = emptyList(),
)

@Serializable
data class ScreenSourceDto(val title: String, val url: String? = null)

@Serializable(with = StepSerializer::class)
sealed interface StepDto

@Serializable
data class ScreenStepDto(
    val number: String,
    val index: Int,
    val total: Int,
    @SerialName("can_go_back") val canGoBack: Boolean = false,
    val blocks: List<BlockDto> = emptyList(),
    val sources: List<ScreenSourceDto>? = null,
    /** "ai" or "human" when the screen was added in answer to a request. */
    @SerialName("added_in_answer") val addedInAnswer: String? = null,
    val help: List<HelpNoticeDto> = emptyList(),
) : StepDto

@Serializable
data class QuestionStepDto(
    @SerialName("question_id") val questionId: String,
    @SerialName("presentation_id") val presentationId: String,
    val prompt: List<BlockDto>,
    /** In the order shown. Carries no correctness: that comes back in the answer. */
    val options: List<QuestionOptionDto>,
    val answered: Int = 0,
    val total: Int = 0,
    val misses: Int = 0,
    @SerialName("help_offered") val helpOffered: Boolean = false,
    val help: List<HelpNoticeDto> = emptyList(),
) : StepDto

@Serializable
data class RemediationStepDto(
    val number: String,
    /** Which re-taught screen this is, counting from 0. */
    val position: Int,
    val of: Int,
    @SerialName("help_offered") val helpOffered: Boolean = false,
    val blocks: List<BlockDto> = emptyList(),
    val sources: List<ScreenSourceDto>? = null,
    @SerialName("added_in_answer") val addedInAnswer: String? = null,
    val help: List<HelpNoticeDto> = emptyList(),
) : StepDto

@Serializable
data class PassedQuestionDto(
    @SerialName("question_id") val questionId: String,
    @SerialName("first_try") val firstTry: String,
    val misses: Int = 0,
)

@Serializable
data class PassedStepDto(
    @SerialName("first_try_right") val firstTryRight: Int,
    val total: Int,
    val questions: List<PassedQuestionDto> = emptyList(),
) : StepDto

data object PausedStepDto : StepDto

@Serializable
data class ReviewDoneStepDto(@SerialName("first_try") val firstTry: String? = null) : StepDto

data class UnknownStepDto(val kind: String) : StepDto

object StepSerializer : JsonContentPolymorphicSerializer<StepDto>(StepDto::class) {
    override fun selectDeserializer(element: JsonElement): DeserializationStrategy<StepDto> =
        when (element.jsonObject["kind"]?.jsonPrimitive?.content) {
            "screen" -> ScreenStepDto.serializer()
            "question" -> QuestionStepDto.serializer()
            "remediation" -> RemediationStepDto.serializer()
            "passed" -> PassedStepDto.serializer()
            "review_done" -> ReviewDoneStepDto.serializer()
            "paused" -> PausedStepSerializer
            else -> UnknownStepSerializer
        }
}

private object PausedStepSerializer : kotlinx.serialization.KSerializer<StepDto> {
    override val descriptor = kotlinx.serialization.json.JsonObject.serializer().descriptor
    override fun deserialize(decoder: kotlinx.serialization.encoding.Decoder): StepDto {
        (decoder as kotlinx.serialization.json.JsonDecoder).decodeJsonElement()
        return PausedStepDto
    }
    override fun serialize(encoder: kotlinx.serialization.encoding.Encoder, value: StepDto) =
        throw UnsupportedOperationException("Steps are only ever read by the app")
}

/** A step kind a newer server sends that this version cannot draw. */
private object UnknownStepSerializer : kotlinx.serialization.KSerializer<StepDto> {
    override val descriptor = kotlinx.serialization.json.JsonObject.serializer().descriptor
    override fun deserialize(decoder: kotlinx.serialization.encoding.Decoder): StepDto {
        val element = (decoder as kotlinx.serialization.json.JsonDecoder).decodeJsonElement()
        return UnknownStepDto(element.jsonObject["kind"]?.jsonPrimitive?.content ?: "?")
    }
    override fun serialize(encoder: kotlinx.serialization.encoding.Encoder, value: StepDto) =
        throw UnsupportedOperationException("Steps are only ever read by the app")
}

@Serializable
data class LessonSummaryDto(
    val slug: String,
    val title: String,
    val stage: String = "",
    /** The caller authored this course. Feedback tools are owner-only; absent means not owner. */
    @SerialName("is_owner") val isOwner: Boolean = false,
)

@Serializable
data class LessonStepResponseDto(
    val lesson: LessonSummaryDto,
    val resumed: Boolean = false,
    val step: StepDto,
)

@Serializable
data class RevealedAnswerDto(
    val correct: Boolean,
    @SerialName("chosen_position") val chosenPosition: Int,
    @SerialName("correct_position") val correctPosition: Int,
    val reason: List<BlockDto> = emptyList(),
    @SerialName("correct_reason") val correctReason: List<BlockDto> = emptyList(),
    val misses: Int = 0,
    @SerialName("help_offered") val helpOffered: Boolean = false,
)

@Serializable
data class UnlockedLessonDto(val slug: String, val title: String)

@Serializable
data class LessonAnswerResponseDto(
    val lesson: LessonSummaryDto,
    val answer: RevealedAnswerDto,
    val step: StepDto,
    val passed: Boolean = false,
    val unlocked: List<UnlockedLessonDto> = emptyList(),
)

@Serializable
data class AnswerRequest(val choice: Int)

@Serializable
data class LessonScreenDto(
    val number: String,
    val blocks: List<BlockDto> = emptyList(),
    val sources: List<ScreenSourceDto>? = null,
    @SerialName("added_in_answer") val addedInAnswer: String? = null,
)

@Serializable
data class HelpRequest(val selection: String? = null, val note: String? = null)

@Serializable
data class HelpSentDto(
    val id: String,
    val number: String,
    @SerialName("question_id") val questionId: String? = null,
)

@Serializable
data class LessonScreensDto(val lesson: LessonSummaryDto, val screens: List<LessonScreenDto> = emptyList())

@Serializable
data class CommentRequest(val body: String)

@Serializable
data class ScreenCommentDto(val id: String, val number: String, val body: String)

@Serializable
data class DueReviewDto(
    @SerialName("question_id") val questionId: String,
    val lesson: String? = null,
    @SerialName("due_at") val dueAt: String,
)

@Serializable
data class DueReviewsDto(
    val due: List<DueReviewDto> = emptyList(),
    val upcoming: Int = 0,
    @SerialName("next_due_at") val nextDueAt: String? = null,
)

@Serializable
data class ReviewStepResponseDto(
    @SerialName("question_id") val questionId: String,
    val step: StepDto,
)

@Serializable
data class ReviewAnswerResponseDto(
    @SerialName("question_id") val questionId: String,
    val answer: RevealedAnswerDto,
    val step: StepDto,
    @SerialName("next_due_at") val nextDueAt: String? = null,
)
