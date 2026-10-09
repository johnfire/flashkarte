"""Check the learner-facing GDPR fixtures (English, and the German edition's shared rules) before import."""

import json
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from lesson_builder import build_course

ROOT = Path(__file__).resolve().parent


def check_options(options, label):
    failures = []
    if len(options) < 2 or sum(option.get("correct") is True for option in options) != 1:
        failures.append(f"{label}: exactly one correct option required")
    if any(not option.get("blocks") or not option.get("reason") for option in options):
        failures.append(f"{label}: option text and reason required")
    if len({json.dumps(option.get("blocks")) for option in options}) != len(options):
        failures.append(f"{label}: duplicate option text")
    return failures


def check_question(question, covers, refs, label):
    failures = check_options(question["options"], label)
    if not question.get("prompt"):
        failures.append(f"{label}: prompt required")
    if not question["covers"] or not set(question["covers"]) <= covers:
        failures.append(f"{label}: unknown or missing assessed concept")
    if not question["teaches"] or not set(question["teaches"]) <= refs:
        failures.append(f"{label}: unknown or missing teaching screen")
    if not question.get("variants"):
        failures.append(f"{label}: reworded retest required")
    correct = [option["blocks"] for option in question["options"] if option["correct"]]
    for index, variant in enumerate(question.get("variants", [])):
        failures.extend(check_options(variant["options"], f"{label} variant {index}"))
        if not variant.get("prompt") or variant["prompt"] == question["prompt"]:
            failures.append(f"{label}: retest must be reworded")
        if [option["blocks"] for option in variant["options"] if option["correct"]] != correct:
            failures.append(f"{label}: retest changes the answer")
    return failures


def check_screens(screens, label):
    failures = []
    refs = [screen["ref"] for screen in screens]
    if len(set(refs)) != len(refs):
        failures.append(f"{label}: duplicate screen refs")
    for screen in screens:
        sources = screen.get("sources", [])
        if not screen.get("blocks") or not sources:
            failures.append(f"{label}: screen text and sources required")
        if any(not source.get("title") or urlparse(source.get("url", "")).scheme != "https" for source in sources):
            failures.append(f"{label}: named HTTPS source required")
    return failures


def check_lesson(fixture):
    label = fixture["lesson"]["slug"]
    covers = set(fixture["lesson"]["covers"])
    failures = check_screens(fixture["screens"], label)
    if not 4 <= len(fixture["screens"]) <= 10 or not 3 <= len(fixture["questions"]) <= 5:
        failures.append(f"{label}: lesson size outside authoring limits")
    refs = {screen["ref"] for screen in fixture["screens"]}
    assessed = set()
    for index, question in enumerate(fixture["questions"]):
        failures.extend(check_question(question, covers, refs, f"{label} question {index}"))
        assessed.update(question["covers"])
    if assessed != covers:
        failures.append(f"{label}: covered concepts are not all assessed")
    if not fixture["lesson"]["summary"]:
        failures.append(f"{label}: summary required")
    return failures


def check_course(curriculum, fixtures, locale="en"):
    failures = []
    if fixtures != build_course(curriculum, locale):
        failures.append(f"{locale} fixtures are stale: run python3 lesson_builder.py")
    taught = Counter(concept for fixture in fixtures for concept in fixture["lesson"]["covers"])
    concepts = {concept["slug"] for concept in curriculum["concepts"] if concept["kind"] != "assumption"}
    if set(taught) != concepts or any(count != 1 for count in taught.values()):
        failures.append("every planned concept must be taught exactly once")
    imported = set()
    for fixture in fixtures:
        failures.extend(check_lesson(fixture))
        slug = fixture["lesson"]["slug"]
        if slug in imported:
            failures.append(f"{slug}: duplicate lesson")
        if not {p["lesson"] for p in fixture["lesson"]["prerequisites"]} <= imported:
            failures.append(f"{slug}: prerequisite is not imported earlier")
        imported.add(slug)
    return failures


def read_fixtures(curriculum, locale="en"):
    return [json.loads((ROOT / "lessons" / locale / f"{lesson['id'].lower()}.json").read_text())
            for lesson in curriculum["lessons"]]


def main():
    curriculum = json.loads((ROOT / "curriculum.json").read_text())
    failures = check_course(curriculum, read_fixtures(curriculum))
    if failures:
        sys.exit("\n".join(failures))
    fixtures = read_fixtures(curriculum)
    screens = sum(len(fixture["screens"]) for fixture in fixtures)
    questions = sum(len(fixture["questions"]) for fixture in fixtures)
    print(f"Validated {len(fixtures)} English lessons, {screens} screens, {questions} questions with retests")


if __name__ == "__main__":
    main()
