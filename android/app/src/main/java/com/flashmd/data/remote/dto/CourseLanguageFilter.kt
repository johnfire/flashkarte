package com.flashmd.data.remote.dto

/** The explanation-language filter shared by the course library and personal courses. */
enum class CourseLanguageFilter(val queryValue: String?) {
    ALL(null),
    GERMAN("de"),
    ENGLISH("en"),
    ARABIC("ar");

    val routeValue: String get() = queryValue ?: "all"

    fun includes(locale: String?): Boolean = queryValue == null || locale == queryValue

    companion object {
        fun fromRoute(value: String): CourseLanguageFilter =
            entries.firstOrNull { it.routeValue == value }
                ?: throw IllegalArgumentException("Unknown course language")
    }
}
