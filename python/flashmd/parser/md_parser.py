import re
from dataclasses import dataclass, field


@dataclass
class ParsedCard:
    front: str
    back: str
    category: str | None = None


@dataclass
class ParsedDeck:
    title: str
    source_file: str
    cards: list[ParsedCard] = field(default_factory=list)


_RE_H1 = re.compile(r'^# (.+)')
_RE_H2 = re.compile(r'^## (.+)')
_RE_FRONT = re.compile(r'^\*\*\d+\.\s(.+?)\*\*')
_RE_HR = re.compile(r'^---+$')
# Alternative "Q:/A:" card format. `Q:` opens a card (front); the following
# `A:` line becomes the first paragraph of the back, with any further lines as
# additional paragraphs.
_RE_QFRONT = re.compile(r'^Q:\s*(.+)')
_RE_ABACK = re.compile(r'^A:\s*(.+)')


def parse(text: str, source_file: str = "") -> ParsedDeck:
    """
    Parse markdown text into a ParsedDeck.
    Returns a ParsedDeck with an empty cards list if no cards found
    (caller should check and raise an error for the user).
    """
    lines = text.splitlines()

    title = ""
    current_category: str | None = None
    current_front: str | None = None
    current_is_qa = False
    back_lines: list[str] = []
    cards: list[ParsedCard] = []

    def flush_card():
        nonlocal current_front, back_lines
        if current_front is not None:
            back = _clean_back(back_lines)
            cards.append(ParsedCard(
                front=current_front,
                back=back,
                category=current_category,
            ))
        current_front = None
        back_lines = []

    for line in lines:
        m_h1 = _RE_H1.match(line)
        m_h2 = _RE_H2.match(line)
        m_front = _RE_FRONT.match(line)
        m_hr = _RE_HR.match(line)
        m_q = _RE_QFRONT.match(line)
        m_a = _RE_ABACK.match(line)

        if m_h1 and not title:
            title = m_h1.group(1).strip()
        elif m_h2:
            flush_card()
            current_category = m_h2.group(1).strip()
        elif m_hr:
            # horizontal rule: just a separator, ignore
            pass
        elif m_front:
            flush_card()
            current_front = m_front.group(1).strip()
            current_is_qa = False
        elif m_q:
            flush_card()
            current_front = m_q.group(1).strip()
            current_is_qa = True
        elif (
            m_a
            and current_front is not None
            and current_is_qa
            and all(not l.strip() for l in back_lines)
        ):
            # First `A:` after a `Q:`: answer becomes its own paragraph, so any
            # description lines that follow land in a separate paragraph.
            back_lines.append(m_a.group(1).strip())
            back_lines.append("")
        elif current_front is not None:
            back_lines.append(line)

    flush_card()

    if not title:
        title = source_file

    return ParsedDeck(title=title, source_file=source_file, cards=cards)


def _clean_back(lines: list[str]) -> str:
    """Join back lines, collapsing runs of blank lines into paragraph breaks."""
    # Remove leading and trailing blank lines
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()

    if not lines:
        return ""

    paragraphs: list[str] = []
    current: list[str] = []

    for line in lines:
        if line.strip():
            current.append(line.strip())
        else:
            if current:
                paragraphs.append(" ".join(current))
                current = []

    if current:
        paragraphs.append(" ".join(current))

    return "\n\n".join(paragraphs)
