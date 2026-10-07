"""Build the English GDPR lesson fixtures from the authored module files, without contacting Flashkarte."""

import importlib
import json
from pathlib import Path

from sources import SOURCES

ROOT = Path(__file__).resolve().parent
MODULE_FILES = {"M0": "lesson_content_m0", "M1": "lesson_content_m1", "M2": "lesson_content_m2",
                "M3": "lesson_content_m3", "M4": "lesson_content_m4", "M5": "lesson_content_m5"}
SHORT = {
    "GDPR": "GDPR (Regulation (EU) 2016/679)",
    "GDPR-REC": "GDPR recitals",
    "EPD": "ePrivacy Directive 2002/58/EC",
    "CJ-PLANET49": "CJEU C-673/17 Planet49",
    "CJ-FASHIONID": "CJEU C-40/17 Fashion ID",
    "CJ-SCHREMS2": "CJEU C-311/18 Schrems II",
    "DPF": "Commission Implementing Decision (EU) 2023/1795",
    "AIA": "EU AI Act (Regulation (EU) 2024/1689)",
    "PROP-501": "Commission proposal COM(2025) 501",
    "PROP-837": "Commission proposal COM(2025) 837",
}


def assessment(concept_positions, screen_positions, prompt, variant, correct, wrong_first, wrong_second):
    """One question and a reworded retest. Each choice is (text, reason); the first is correct."""
    return {
        "concept_positions": concept_positions,
        "screen_positions": screen_positions,
        "prompt": prompt,
        "variant_prompt": variant,
        "choices": [correct, wrong_first, wrong_second],
    }


def build_question(authored, planned, position):
    options = [
        {"correct": index == 0, "blocks": text, "reason": reason}
        for index, (text, reason) in enumerate(authored["choices"])
    ]
    offset = position % len(options)
    ordered = options[offset:] + options[:offset]
    variant_order = ordered[1:] + ordered[:1]
    return {
        "covers": [planned["covers"][index] for index in authored["concept_positions"]],
        "teaches": [f"screen-{index}" for index in authored["screen_positions"]],
        "prompt": authored["prompt"],
        "options": ordered,
        "variants": [{"prompt": authored["variant_prompt"], "options": variant_order}],
    }


def lesson_sources(authored):
    return [{"title": f"{SHORT[source_id]}, {locator}", "url": SOURCES[source_id]["url"]}
            for source_id, locator in authored["sources"]]


def build_lesson(authored, planned, modules):
    sources = lesson_sources(authored)
    return {
        "module": modules[planned["module"]],
        "lesson": {
            "slug": planned["id"].lower(),
            "title": planned["title"],
            "summary": authored["summary"],
            "covers": planned["covers"],
            "prerequisites": [
                {"lesson": prerequisite["lesson_id"].lower(), "reason": prerequisite["reason"]}
                for prerequisite in planned["prerequisites"]
            ],
        },
        "screens": [
            {"ref": f"screen-{index}", "blocks": blocks, "sources": sources}
            for index, blocks in enumerate(authored["screens"], start=1)
        ],
        "questions": [build_question(question, planned, index) for index, question in enumerate(authored["questions"])],
    }


def authored_lessons(curriculum):
    authored = {}
    for module in curriculum["modules"]:
        content = importlib.import_module(MODULE_FILES[module["id"]])
        if overlap := authored.keys() & content.LESSONS.keys():
            raise ValueError(f"Duplicate authored lessons: {sorted(overlap)}")
        authored.update(content.LESSONS)
    return authored


def build_course(curriculum):
    modules = {module["id"]: module["title"] for module in curriculum["modules"]}
    authored = authored_lessons(curriculum)
    planned_ids = {lesson["id"] for lesson in curriculum["lessons"]}
    if authored.keys() != planned_ids:
        raise ValueError(f"Authoring differs from plan: {sorted(authored.keys() ^ planned_ids)}")
    return [build_lesson(authored[lesson["id"]], lesson, modules) for lesson in curriculum["lessons"]]


def subject_import(curriculum):
    return {
        "title": curriculum["title"],
        "description": curriculum["description"],
        "locale": "en",
        "concepts": [{key: concept[key] for key in ("slug", "name", "kind", "tier")} for concept in curriculum["concepts"]],
        "edges": [{"from": e["parent"], "to": e["child"], "strength": e["kind"], "reason": e["reason"]}
                  for e in curriculum["edges"]],
    }


def write_course():
    curriculum = json.loads((ROOT / "curriculum.json").read_text())
    lessons = build_course(curriculum)
    destination = ROOT / "lessons" / "en"
    destination.mkdir(parents=True, exist_ok=True)
    for lesson in lessons:
        (destination / f"{lesson['lesson']['slug']}.json").write_text(json.dumps(lesson, indent=2, ensure_ascii=False) + "\n")
    (ROOT / "subject-import.json").write_text(json.dumps(subject_import(curriculum), indent=2, ensure_ascii=False) + "\n")
    print(f"Built {len(lessons)} English lesson fixtures")


if __name__ == "__main__":
    write_course()
