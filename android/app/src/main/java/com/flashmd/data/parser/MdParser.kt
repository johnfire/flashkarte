package com.flashmd.data.parser

data class ParsedOption(
    val text: String,
    val goto: String,
)

data class ParsedCard(
    val type: String,           // "basic" | "branch"
    val front: String,
    val back: String,
    val category: String?,
    val label: String?,
    val options: List<ParsedOption>,
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
    // Branching: an anchor line [label], and option lines "- text -> target".
    private val ANCHOR = Regex("""^\[([A-Za-z0-9_-]+)\]\s*$""")

    // Option line "- <text> -> <target>". Parsed with linear string ops, not one
    // backtracking regex: the old ^-\s+(.+?)\s+->\s+(\S+)\s*$ backtracked
    // catastrophically (ReDoS) on long whitespace runs. The "->" is anchored at
    // end of line, preserving the original "target = final token" semantics.
    // Keep in sync with packages/shared/src/markdown/parser.ts.
    private val OPTION_TAIL = Regex("""\s->\s+(\S+)\s*$""")
    private val OPTION_LEAD = Regex("""^-\s+""")

    private fun matchOption(line: String): ParsedOption? {
        if (line.length < 2 || line[0] != '-' || !line[1].isWhitespace()) return null
        val tail = OPTION_TAIL.find(line) ?: return null
        val text = line.substring(0, tail.range.first).replace(OPTION_LEAD, "").trim()
        if (text.isEmpty()) return null
        return ParsedOption(text, tail.groupValues[1])
    }

    fun parse(text: String, sourceFile: String = ""): ParsedDeck {
        val lines = text.lines()
        var title = ""
        var currentCategory: String? = null
        var currentFront: String? = null
        var currentIsQA = false
        var currentLabel: String? = null
        var pendingLabel: String? = null
        val backLines = mutableListOf<String>()
        var options = mutableListOf<ParsedOption>()
        val cards = mutableListOf<ParsedCard>()

        fun flushCard() {
            val front = currentFront ?: return
            cards += ParsedCard(
                type = if (options.isNotEmpty()) "branch" else "basic",
                front = front,
                back = if (options.isNotEmpty()) "" else cleanBack(backLines.toList()),
                category = currentCategory,
                label = currentLabel,
                options = options.toList(),
            )
            currentFront = null
            currentLabel = null
            backLines.clear()
            options = mutableListOf()
        }

        fun openCard(front: String, isQA: Boolean) {
            flushCard()
            currentFront = front
            currentIsQA = isQA
            currentLabel = pendingLabel
            pendingLabel = null
        }

        for (line in lines) {
            val mH1 = H1.find(line)
            val mH2 = H2.find(line)
            val mFront = FRONT.find(line)
            val mQ = QFRONT.find(line)
            val mA = ABACK.find(line)
            val mAnchor = ANCHOR.find(line)
            val mOption = if (currentFront != null) matchOption(line) else null

            when {
                mH1 != null && title.isEmpty() -> title = mH1.groupValues[1].trim()
                mAnchor != null -> pendingLabel = mAnchor.groupValues[1]
                mH2 != null -> {
                    flushCard()
                    currentCategory = mH2.groupValues[1].trim()
                }
                HR.matches(line) -> { /* separator, skip */ }
                mFront != null -> openCard(mFront.groupValues[1].trim(), false)
                mQ != null -> openCard(mQ.groupValues[1].trim(), true)
                mOption != null -> options += mOption
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
