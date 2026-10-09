"""Check the German edition against the English one and against the official German texts.

The German edition must be a structural mirror of the English edition, so that learners of either edition get
the same course and later edits can be compared lesson by lesson. Its legal quotations must be verbatim from the
German official texts retained in sources/.

Run all checks:              python3 german_validation.py
Check only some modules:     python3 german_validation.py M0 M1
"""

import html
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

import lesson_builder
from lesson_validation import check_course, check_lesson, read_fixtures
from sources import SOURCES, file_name

ROOT = Path(__file__).resolve().parent

# „…“ marks a verbatim quotation from an official German text. »…« marks invented or everyday wording.
QUOTE = re.compile(r"„([^“]*)“")
ENGLISH = re.compile(r"\b(the|and|of|is|are|must|which|with|when|Article|Articles|recital|controller|processor|"
                     r"data subject|Sunfield)\b")
INFORMAL = re.compile(r"\b(du|Du|dein\w*|Dein\w*|dich|Dich|dir|Dir|euch|Euch)\b")
MARKERS = re.compile(r"[▼►◄]\w*")


def normalise(text):
    return " ".join(text.replace("\xa0", " ").replace("­", "").split())


@lru_cache(maxsize=None)
def official_german():
    """Plain text of every retained German source, joined, without consolidation markers."""
    texts = []
    for source_id in SOURCES:
        raw = (ROOT / "sources" / file_name(source_id, "de")).read_text(encoding="utf-8")
        raw = re.sub(r"(?s)<(script|style).*?</\1>", " ", raw)
        texts.append(MARKERS.sub(" ", html.unescape(re.sub(r"<[^>]+>", " ", raw))))
    return normalise(" ".join(texts))


def strip_markup(text):
    return re.sub(r"\*+|`", "", text)


def texts(value):
    """Every learner-facing string in a block, list of blocks or fixture fragment."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from texts(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            if key in ("text", "items", "blocks", "prompt", "reason", "title", "summary"):
                yield from texts(item)
            elif key in ("screens", "questions", "options", "variants", "lesson", "prerequisites"):
                yield from texts(item)


def learner_text(fixture):
    """(where, text) for the lesson fields, screens and questions; sources are checked separately."""
    lesson = fixture["lesson"]
    yield "title", lesson["title"]
    yield "summary", lesson["summary"]
    for prerequisite in lesson["prerequisites"]:
        yield f"prerequisite {prerequisite['lesson']}", prerequisite["reason"]
    for screen in fixture["screens"]:
        for text in texts(screen["blocks"]):
            yield screen["ref"], text
    for index, question in enumerate(fixture["questions"]):
        for text in texts({"prompt": question["prompt"], "options": question["options"], "variants": question["variants"]}):
            yield f"question {index}", text


def check_quotes(fixture):
    failures = []
    corpus = official_german()
    for where, text in learner_text(fixture):
        plain = normalise(strip_markup(text))
        if '"' in plain:
            failures.append(f"{fixture['lesson']['slug']} {where}: use „…“ for official quotations or »…« otherwise: {plain[:80]}")
        for quoted in QUOTE.findall(plain):
            for part in (piece.strip(" ,;") for piece in quoted.split("…")):
                if part and part not in corpus:
                    failures.append(f"{fixture['lesson']['slug']} {where}: not verbatim in the German sources: „{part}“")
    return failures


def check_language(fixture):
    failures = []
    for where, text in learner_text(fixture):
        plain = strip_markup(text)
        if match := ENGLISH.search(plain):
            failures.append(f"{fixture['lesson']['slug']} {where}: English word {match.group(0)!r}: {plain[:80]}")
        if match := INFORMAL.search(plain):
            failures.append(f"{fixture['lesson']['slug']} {where}: informal address {match.group(0)!r}; use Sie")
    for screen in fixture["screens"]:
        for source in screen["sources"]:
            if "/DE/" not in source["url"] or re.search(r"\b(Article|Articles|recital)\b", source["title"]):
                failures.append(f"{fixture['lesson']['slug']} {screen['ref']}: German source title and EUR-Lex DE link required")
    return failures


def block_shape(block):
    if isinstance(block, str):
        return "paragraph"
    if block.get("type") == "list":
        return ("list", bool(block.get("ordered")), len(block["items"]))
    return (block.get("type"), block.get("tone"))


def correct_index(options):
    return [index for index, option in enumerate(options) if option["correct"]]


def check_parity(english, german):
    """The German lesson must have the same structure as the English lesson."""
    slug = english["lesson"]["slug"]
    failures = []
    if german["lesson"]["slug"] != slug:
        return [f"{slug}: lesson order differs from English"]
    for key in ("covers",):
        if german["lesson"][key] != english["lesson"][key]:
            failures.append(f"{slug}: {key} differs from English")
    if [p["lesson"] for p in german["lesson"]["prerequisites"]] != [p["lesson"] for p in english["lesson"]["prerequisites"]]:
        failures.append(f"{slug}: prerequisites differ from English")
    if len(german["screens"]) != len(english["screens"]):
        return failures + [f"{slug}: {len(german['screens'])} screens, English has {len(english['screens'])}"]
    for en_screen, de_screen in zip(english["screens"], german["screens"]):
        if [block_shape(b) for b in de_screen["blocks"]] != [block_shape(b) for b in en_screen["blocks"]]:
            failures.append(f"{slug} {en_screen['ref']}: block structure differs from English")
        if [s["url"].replace("/DE/", "/EN/") for s in de_screen["sources"]] != [s["url"] for s in en_screen["sources"]]:
            failures.append(f"{slug} {en_screen['ref']}: sources differ from English")
    if len(german["questions"]) != len(english["questions"]):
        return failures + [f"{slug}: {len(german['questions'])} questions, English has {len(english['questions'])}"]
    for index, (en_q, de_q) in enumerate(zip(english["questions"], german["questions"])):
        for key in ("covers", "teaches"):
            if de_q[key] != en_q[key]:
                failures.append(f"{slug} question {index}: {key} differs from English")
        if correct_index(de_q["options"]) != correct_index(en_q["options"]):
            failures.append(f"{slug} question {index}: correct option differs from English")
    return failures


def check_german(curriculum, module_ids=None):
    english = {fixture["lesson"]["slug"]: fixture for fixture in lesson_builder.build_course(curriculum, "en")}
    german = lesson_builder.build_course(curriculum, "de", module_ids, partial=module_ids is not None)
    failures = []
    if module_ids is None:
        failures += [f"de: {failure}" for failure in check_course(curriculum, read_fixtures(curriculum, "de"), "de")]
        lesson_builder.localized_edition(curriculum)
    for fixture in german:
        failures += check_lesson(fixture)
        failures += check_parity(english[fixture["lesson"]["slug"]], fixture)
        failures += check_quotes(fixture)
        failures += check_language(fixture)
    return failures, german


def main():
    curriculum = json.loads((ROOT / "curriculum.json").read_text())
    module_ids = set(sys.argv[1:]) or None
    failures, german = check_german(curriculum, module_ids)
    if failures:
        sys.exit("\n".join(failures))
    screens = sum(len(fixture["screens"]) for fixture in german)
    questions = sum(len(fixture["questions"]) for fixture in german)
    quotes = sum(len(QUOTE.findall(strip_markup(t))) for fixture in german for _, t in learner_text(fixture))
    print(f"Validated {len(german)} German lessons, {screens} screens, {questions} questions, {quotes} verbatim quotations")
    if module_ids:
        done = {fixture["lesson"]["slug"].upper() for fixture in german}
        missing = [l["id"] for l in curriculum["lessons"] if l["module"] in module_ids and l["id"] not in done]
        if missing:
            print(f"Not yet translated: {', '.join(missing)}")


if __name__ == "__main__":
    main()
