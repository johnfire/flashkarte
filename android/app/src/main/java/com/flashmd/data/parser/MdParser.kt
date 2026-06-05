package com.flashmd.data.parser

data class ParsedCard(
    val front: String,
    val back: String,
    val category: String?,
)

data class ParsedDeck(
    val title: String,
    val sourceFile: String,
    val cards: List<ParsedCard>,
)

object MdParser {
    private val H1 = Regex("""^# (.+)""")
    private val H2 = Regex("""^## (.+)""")
    private val FRONT = Regex("""^\*\*\d+\.\s(.+?)\*\*""")
    private val HR = Regex("""^---+$""")
    // Alternative "Q:/A:" card format. `Q:` opens a card (front); the following
    // `A:` line becomes the first paragraph of the back, with any further lines
    // as additional paragraphs.
    private val QFRONT = Regex("""^Q:\s*(.+)""")
    private val ABACK = Regex("""^A:\s*(.+)""")

    fun parse(text: String, sourceFile: String = ""): ParsedDeck {
        val lines = text.lines()
        var title = ""
        var currentCategory: String? = null
        var currentFront: String? = null
        var currentIsQA = false
        val backLines = mutableListOf<String>()
        val cards = mutableListOf<ParsedCard>()

        fun flushCard() {
            val front = currentFront ?: return
            cards += ParsedCard(
                front = front,
                back = cleanBack(backLines.toList()),
                category = currentCategory,
            )
            currentFront = null
            backLines.clear()
        }

        for (line in lines) {
            val mH1 = H1.find(line)
            val mH2 = H2.find(line)
            val mFront = FRONT.find(line)
            val mQ = QFRONT.find(line)
            val mA = ABACK.find(line)

            when {
                mH1 != null && title.isEmpty() -> title = mH1.groupValues[1].trim()
                mH2 != null -> {
                    flushCard()
                    currentCategory = mH2.groupValues[1].trim()
                }
                HR.matches(line) -> { /* separator, skip */ }
                mFront != null -> {
                    flushCard()
                    currentFront = mFront.groupValues[1].trim()
                    currentIsQA = false
                }
                mQ != null -> {
                    flushCard()
                    currentFront = mQ.groupValues[1].trim()
                    currentIsQA = true
                }
                mA != null && currentFront != null && currentIsQA &&
                    backLines.all { it.isBlank() } -> {
                    // First `A:` after a `Q:`: answer becomes its own paragraph,
                    // so any description lines that follow land in a separate one.
                    backLines += mA.groupValues[1].trim()
                    backLines += ""
                }
                currentFront != null -> backLines += line
            }
        }
        flushCard()

        return ParsedDeck(
            title = title.ifEmpty { sourceFile },
            sourceFile = sourceFile,
            cards = cards,
        )
    }

    private fun cleanBack(lines: List<String>): String {
        val trimmed = lines.dropWhile { it.isBlank() }.dropLastWhile { it.isBlank() }
        if (trimmed.isEmpty()) return ""

        val paragraphs = mutableListOf<String>()
        val current = mutableListOf<String>()

        for (line in trimmed) {
            if (line.isBlank()) {
                if (current.isNotEmpty()) {
                    paragraphs += current.joinToString(" ") { it.trim() }
                    current.clear()
                }
            } else {
                current += line
            }
        }
        if (current.isNotEmpty()) paragraphs += current.joinToString(" ") { it.trim() }

        return paragraphs.joinToString("\n\n")
    }
}
