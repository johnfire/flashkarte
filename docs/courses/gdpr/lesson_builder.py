"""Build the English and German GDPR lesson fixtures from the authored module files, without contacting Flashkarte."""

import importlib
import json
import sys
from pathlib import Path

import curriculum_de
from sources import url

ROOT = Path(__file__).resolve().parent
LOCALES = ("en", "de")


def module_file(module_id, locale):
    infix = "" if locale == "en" else f"{locale}_"
    return f"lesson_content_{infix}{module_id.lower()}"

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


def lesson_sources(authored, locale):
    short = SHORT if locale == "en" else curriculum_de.SHORT
    return [{"title": f"{short[source_id]}, {locator}", "url": url(source_id, locale)}
            for source_id, locator in authored["sources"]]


def prerequisite_reason(authored, planned, prerequisite, locale):
    """English reasons come from the plan; a translation gives one per planned prerequisite."""
    if locale == "en":
        return prerequisite["reason"]
    reasons = authored["prerequisites"]
    expected = {p["lesson_id"] for p in planned["prerequisites"]}
    if set(reasons) != expected:
        raise ValueError(f"{planned['id']} ({locale}): prerequisite reasons {sorted(reasons)} != plan {sorted(expected)}")
    return reasons[prerequisite["lesson_id"]]


def build_lesson(authored, planned, modules, locale="en"):
    sources = lesson_sources(authored, locale)
    return {
        "module": modules[planned["module"]],
        "lesson": {
            "slug": planned["id"].lower(),
            "title": planned["title"] if locale == "en" else authored["title"],
            "summary": authored["summary"],
            "covers": planned["covers"],
            "prerequisites": [
                {"lesson": prerequisite["lesson_id"].lower(),
                 "reason": prerequisite_reason(authored, planned, prerequisite, locale)}
                for prerequisite in planned["prerequisites"]
            ],
        },
        "screens": [
            {"ref": f"screen-{index}", "blocks": blocks, "sources": sources}
            for index, blocks in enumerate(authored["screens"], start=1)
        ],
        "questions": [build_question(question, planned, index) for index, question in enumerate(authored["questions"])],
    }


def authored_lessons(curriculum, locale="en", module_ids=None):
    authored = {}
    for module in curriculum["modules"]:
        if module_ids is not None and module["id"] not in module_ids:
            continue
        content = importlib.import_module(module_file(module["id"], locale))
        if overlap := authored.keys() & content.LESSONS.keys():
            raise ValueError(f"Duplicate authored lessons: {sorted(overlap)}")
        authored.update(content.LESSONS)
    return authored


def module_titles(curriculum, locale):
    if locale == "en":
        return {module["id"]: module["title"] for module in curriculum["modules"]}
    return dict(curriculum_de.MODULE_TITLES)


def build_course(curriculum, locale="en", module_ids=None, partial=False):
    """Build every lesson, or only those of the given modules. A partial build skips lessons not yet written,
    and is only for checking a translation in progress."""
    modules = module_titles(curriculum, locale)
    authored = authored_lessons(curriculum, locale, module_ids)
    planned = [lesson for lesson in curriculum["lessons"] if module_ids is None or lesson["module"] in module_ids]
    if partial:
        planned = [lesson for lesson in planned if lesson["id"] in authored]
    planned_ids = {lesson["id"] for lesson in planned}
    if authored.keys() != planned_ids:
        raise ValueError(f"{locale} authoring differs from plan: {sorted(authored.keys() ^ planned_ids)}")
    return [build_lesson(authored[lesson["id"]], lesson, modules, locale) for lesson in planned]


def subject_import(curriculum):
    return {
        "title": curriculum["title"],
        "description": curriculum["description"],
        "locale": "en",
        "concepts": [{key: concept[key] for key in ("slug", "name", "kind", "tier")} for concept in curriculum["concepts"]],
        "edges": [{"from": e["parent"], "to": e["child"], "strength": e["kind"], "reason": e["reason"]}
                  for e in curriculum["edges"]],
    }


def localized_edition(curriculum):
    """The create_localized_edition payload for the German edition."""
    slugs = [concept["slug"] for concept in curriculum["concepts"]]
    if set(slugs) != set(curriculum_de.CONCEPT_NAMES):
        raise ValueError(f"German concept names differ from the graph: {sorted(set(slugs) ^ set(curriculum_de.CONCEPT_NAMES))}")
    return {
        "locale": "de",
        "title": curriculum_de.TITLE,
        "description": curriculum_de.DESCRIPTION,
        "concept_names": {slug: curriculum_de.CONCEPT_NAMES[slug] for slug in slugs},
    }


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def write_course(locales=LOCALES):
    curriculum = json.loads((ROOT / "curriculum.json").read_text())
    for locale in locales:
        lessons = build_course(curriculum, locale)
        destination = ROOT / "lessons" / locale
        destination.mkdir(parents=True, exist_ok=True)
        for lesson in lessons:
            write_json(destination / f"{lesson['lesson']['slug']}.json", lesson)
        print(f"Built {len(lessons)} {locale} lesson fixtures")
    write_json(ROOT / "subject-import.json", subject_import(curriculum))
    if "de" in locales:
        write_json(ROOT / "edition-de.json", localized_edition(curriculum))


if __name__ == "__main__":
    write_course(tuple(sys.argv[1:]) or LOCALES)
