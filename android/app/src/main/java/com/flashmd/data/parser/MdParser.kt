package com.flashmd.data.parser

data class ParsedOption(
    val text: String,
    val goto: String,
)

data class ParsedCard(
    // "basic" cards have front/back and SR state. "branch" cards are play-only.
    // A "basic" card may also carry options when it is a *diagnostic* card
    // (Spec 01): one option targets MdParser.CORRECT_TARGET, the rest route to
    // remediation labels. Detect with isDiagnostic(); the type stays "basic".
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

/** Mirror of the TS `isDiagnostic()` (packages/shared) — keep in sync. */
fun isDiagnostic(card: ParsedCard): Boolean =
    card.type == "basic" && card.options.any { it.goto == MdParser.CORRECT_TARGET }

object MdParser {
    // Reserved option target marking the right answer on a diagnostic card.
    // Mirror of TS CORRECT_TARGET (packages/shared/src/markdown/parser.ts).
    const val CORRECT_TARGET = "correct"

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
        val lead = OPTION_LEAD.find(line) ?: return null
        val tail = OPTION_TAIL.find(line) ?: return null
        // Text between the "- " prefix and " -> "; empty (e.g. "- -> x") means
        // not a valid option, matching the original regex.
        val start = lead.range.last + 1
        if (start > tail.range.first) return null
        val text = line.substring(start, tail.range.first).trim()
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
            // A card with options is a `branch` card UNLESS one option targets
            // CORRECT_TARGET — then it is a diagnostic card, which keeps its
            // `basic` type, front/back and SR state, carrying options alongside.
            val diagnostic = options.any { it.goto == CORRECT_TARGET }
            val isBranch = options.isNotEmpty() && !diagnostic
            cards += ParsedCard(
                type = if (isBranch) "branch" else "basic",
                front = front,
                back = if (isBranch) "" else cleanBack(backLines.toList()),
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
