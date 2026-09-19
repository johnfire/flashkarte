package com.flashmd.data.parser

data class ParsedOption(
    val text: String,
    val goto: String,
)

/**
 * A single meaning of a polysemous headword (Spec 10). `context` is the prompt once the
 * word has graduated to independent cards; `hint` is the scaffold shown while chained.
 * Mirror of the TS `CardSense` — keep in sync.
 */
data class CardSense(
    val context: String?,
    val hint: String?,
    val word: String,
    val index: Int,
    val count: Int,
)

data class ParsedCard(
    // "basic" cards have front/back and SR state. "branch" cards are play-only.
    // A "basic" card may also carry options when it is a *diagnostic* card
    // (Spec 01): one option targets MdParser.CORRECT_TARGET, the rest route to
    // remediation labels. Detect with isDiagnostic(); the type stays "basic".
    // "read" cards are lessons (title + body): read and acknowledged, never rated,
    // no SR state, and never evidence of mastery. Authored with an `@read` tag line.
    val type: String,           // "basic" | "branch" | "read"
    val front: String,
    val back: String,
    val category: String?,
    val label: String?,
    val options: List<ParsedOption>,
    // Set when this card is one meaning of a word block; null for ordinary cards.
    val sense: CardSense? = null,
    // True when a card carries BOTH sense lines and routed options, which is not a
    // meaningful card. The parser keeps today's behaviour (options win, back stays
    // prose) and the server rejects it at upload.
    val senseConflict: Boolean = false,
)

data class ParsedDeck(
    val title: String,
    val sourceFile: String,
    val cards: List<ParsedCard>,
)

/** Mirror of the TS `isDiagnostic()` (packages/shared) — keep in sync. */
fun isDiagnostic(card: ParsedCard): Boolean =
    card.type == "basic" && card.options.any { it.goto == MdParser.CORRECT_TARGET }

/** Mirror of the TS `isReading()` (packages/shared) — keep in sync. */
fun isReading(card: ParsedCard): Boolean = card.type == "read"

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
    // Reading card: an `@read` tag line, on its own, above the card's front. The body is
    // kept as written (lists, code, blank lines), unlike a basic card's back.
    private val READ_TAG = Regex("""^@read\s*$""")
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

    private val SENSE_LEAD = Regex("""^-\s+""")

    private data class RawSense(val gloss: String, val context: String?, val hint: String?)

    /**
     * Sense line: "- <gloss> | <context> | <hint>", only the gloss required. Split into at
     * most three fields, so any further "|" belongs to the hint. matchOption is tried
     * first, so a line ending in " -> target" is an option and never a sense line.
     * Mirror of the TS matchSenseLine — keep in sync.
     */
    private fun matchSenseLine(line: String): RawSense? {
        val lead = SENSE_LEAD.find(line) ?: return null
        val rest = line.substring(lead.range.last + 1)
        if (!rest.contains("|")) return null
        val parts = rest.split("|")
        val gloss = parts[0].trim()
        if (gloss.isEmpty()) return null
        val context = parts.getOrElse(1) { "" }.trim()
        val hint = parts.drop(2).joinToString("|").trim()
        return RawSense(gloss, context.ifEmpty { null }, hint.ifEmpty { null })
    }

    /**
     * A back is a word block only when EVERY non-blank line is a sense line and there are
     * at least two. The strictness keeps existing decks parsing byte-identically.
     * Mirror of the TS detectSenses — keep in sync.
     */
    private fun detectSenses(lines: List<String>): List<RawSense>? {
        val senses = mutableListOf<RawSense>()
        for (line in lines) {
            if (line.isBlank()) continue
            val sense = matchSenseLine(line) ?: return null
            senses += sense
        }
        return if (senses.size >= 2) senses else null
    }

    fun parse(text: String, sourceFile: String = ""): ParsedDeck {
        val lines = text.lines()
        var title = ""
        var currentCategory: String? = null
        var currentFront: String? = null
        var currentIsQA = false
        var currentIsRead = false
        var pendingRead = false
        var currentLabel: String? = null
        var pendingLabel: String? = null
        val backLines = mutableListOf<String>()
        var options = mutableListOf<ParsedOption>()
        val cards = mutableListOf<ParsedCard>()

        fun flushCard() {
            val front = currentFront ?: return
            if (currentIsRead) {
                cards += ParsedCard(
                    type = "read",
                    front = front,
                    back = cleanReadBody(backLines.toList()),
                    category = currentCategory,
                    label = currentLabel,
                    options = emptyList(),
                )
                currentFront = null
                currentIsRead = false
                currentLabel = null
                backLines.clear()
                options = mutableListOf()
                return
            }
            // A card with options is a `branch` card UNLESS one option targets
            // CORRECT_TARGET — then it is a diagnostic card, which keeps its
            // `basic` type, front/back and SR state, carrying options alongside.
            val diagnostic = options.any { it.goto == CORRECT_TARGET }
            val isBranch = options.isNotEmpty() && !diagnostic
            val senses = detectSenses(backLines.toList())

            if (senses != null && options.isEmpty()) {
                // A word block: one card per meaning, sharing the headword as front and
                // laid down contiguously so their positions stay together in the deck.
                val word = slugify(front)
                senses.forEachIndexed { index, sense ->
                    cards += ParsedCard(
                        type = "basic",
                        front = front,
                        back = sense.gloss,
                        category = currentCategory,
                        label = if (index == 0) currentLabel else null,
                        options = emptyList(),
                        sense = CardSense(
                            context = sense.context,
                            hint = sense.hint,
                            word = word,
                            index = index,
                            count = senses.size,
                        ),
                    )
                }
            } else {
                cards += ParsedCard(
                    type = if (isBranch) "branch" else "basic",
                    front = front,
                    back = if (isBranch) "" else cleanBack(backLines.toList()),
                    category = currentCategory,
                    label = currentLabel,
                    options = options.toList(),
                    senseConflict = senses != null,
                )
            }
            currentFront = null
            currentLabel = null
            backLines.clear()
            options = mutableListOf()
        }

        fun openCard(front: String, isQA: Boolean) {
            flushCard()
            currentFront = front
            currentIsQA = isQA
            currentIsRead = pendingRead
            pendingRead = false
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
            // A reading body is prose: "- a -> b" inside it is text, not a branch option.
            val mOption = if (currentFront != null && !currentIsRead) matchOption(line) else null

            when {
                mH1 != null && title.isEmpty() -> title = mH1.groupValues[1].trim()
                mAnchor != null -> pendingLabel = mAnchor.groupValues[1]
                READ_TAG.matches(line) -> pendingRead = true
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

    /**
     * A reading body keeps its structure: only leading/trailing blank lines and trailing
     * whitespace are removed. Deliberately not cleanBack, which would flatten lists and code.
     * Mirror of the TS cleanReadBody — keep in sync.
     */
    private fun cleanReadBody(lines: List<String>): String =
        lines.map { it.trimEnd() }
            .dropWhile { it.isBlank() }
            .dropLastWhile { it.isBlank() }
            .joinToString("\n")

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
