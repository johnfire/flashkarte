"""Print official text from the retained sources, in German or English, for writing and checking translations.

    python3 german_lookup.py art 6            Article 6 of the GDPR, in German
    python3 german_lookup.py art 6 --en       the same article in English
    python3 german_lookup.py rec 47           recital 47, in German
    python3 german_lookup.py find CJ-PLANET49 "für Recht erkannt"     a passage of any source around a phrase
"""

import html
import re
import sys
from pathlib import Path

from sources import SOURCES, file_name

ROOT = Path(__file__).resolve().parent
WORDS = {
    "de": {"article": "Artikel", "adopted": "HABEN FOLGENDE VERORDNUNG ERLASSEN", "chapter": r"KAPITEL [IVX]+|Abschnitt \d+"},
    "en": {"article": "Article", "adopted": "HAVE ADOPTED THIS REGULATION", "chapter": r"CHAPTER [IVX]+|Section \d+"},
}


def lines(source_id, locale):
    raw = (ROOT / "sources" / file_name(source_id, locale)).read_text(encoding="utf-8")
    raw = re.sub(r"(?s)<(script|style).*?</\1>", "", raw)
    text = html.unescape(re.sub(r"<[^>]+>", "\n", raw)).replace("\xa0", " ")
    text = re.sub(r"[▼►◄]\w*", "", text)
    return "\n".join(line.strip() for line in text.split("\n") if line.strip())


def article(number, locale):
    words = WORDS[locale]
    parts = re.split(rf"\n({words['article']} \d+)\n", "\n" + lines("GDPR", locale))
    for index in range(1, len(parts), 2):
        if int(parts[index].split()[1]) == number:
            return re.split(rf"\n(?:{words['chapter']})\n", parts[index + 1])[0].strip()
    raise SystemExit(f"Article {number} not found")


def recital(number, locale):
    text = lines("GDPR-REC", locale)
    text = text[: text.find(WORDS[locale]["adopted"])]
    match = re.search(rf"\n\({number}\)\n(.*?)(?=\n\(\d{{1,3}}\)\n|\Z)", text, re.S)
    if not match:
        raise SystemExit(f"Recital {number} not found")
    return " ".join(match.group(1).split())


def find(source_id, phrase, locale, width=1200):
    text = " ".join(lines(source_id, locale).split())
    index = text.find(phrase)
    if index < 0:
        raise SystemExit(f"{phrase!r} not found in {source_id} ({locale})")
    return text[max(0, index - 200): index + width]


def main():
    args = [arg for arg in sys.argv[1:] if arg != "--en"]
    locale = "en" if "--en" in sys.argv else "de"
    if len(args) < 2:
        raise SystemExit(__doc__)
    kind = args[0]
    if kind == "art":
        print(article(int(args[1]), locale))
    elif kind == "rec":
        print(recital(int(args[1]), locale))
    elif kind == "find" and len(args) >= 3 and args[1] in SOURCES:
        print(find(args[1], " ".join(args[2:]), locale))
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
