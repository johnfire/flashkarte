"""Build the reviewed English lesson fixtures without contacting Flashkarte."""

import importlib
import json
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parent
ACT_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02024R1689-20260727"


def assessment(concept_positions, screen_positions, prompt, variant, correct, wrong_first, wrong_second):
    """Author one decision and an equivalent retest, with explanations per choice."""
    return {
        "concept_positions": concept_positions,
        "screen_positions": screen_positions,
        "prompt": prompt,
        "variant_prompt": variant,
        "choices": [correct, wrong_first, wrong_second],
    }


def build_question(authored, planned, question_position):
    options = [
        {"blocks": text, "correct": position == 0, "reason": reason}
        for position, (text, reason) in enumerate(authored["choices"])
    ]
    offset = question_position % len(options)
    ordered = options[offset:] + options[:offset]
    variant_order = ordered[1:] + ordered[:1]
    return {
        "covers": [planned["covers"][position] for position in authored["concept_positions"]],
        "teaches": [f"screen-{position}" for position in authored["screen_positions"]],
        "prompt": authored["prompt"],
        "options": ordered,
        "variants": [{"prompt": authored["variant_prompt"], "options": variant_order}],
    }


def build_lesson(authored, planned, modules):
    sources = [{"title": f"AI Act, 27 July 2026 baseline: {authored['locator']}", "url": ACT_URL}]
    sources.extend(authored.get("additional_sources", []))
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
            {"ref": f"screen-{position}", "blocks": paragraphs, "sources": sources}
            for position, paragraphs in enumerate(authored["screens"], start=1)
        ],
        "questions": [
            build_question(question, planned, position)
            for position, question in enumerate(authored["questions"])
        ],
    }


def build_course(curriculum):
    modules = {module["id"]: module["title"] for module in curriculum["modules"]}
    authored = {}
    for module in curriculum["modules"]:
        content = importlib.import_module(f"lesson_content_{module['id'].lower()}")
        overlap = authored.keys() & content.LESSONS.keys()
        if overlap:
            raise ValueError(f"Duplicate authored lessons: {sorted(overlap)}")
        authored.update(content.LESSONS)
    planned_ids = {lesson["id"] for lesson in curriculum["lessons"]}
    if authored.keys() != planned_ids:
        raise ValueError(f"Authoring differs from plan: {sorted(authored.keys() ^ planned_ids)}")
    return [build_lesson(authored[lesson["id"]], lesson, modules) for lesson in curriculum["lessons"]]


def write_course():
    curriculum = json.loads((COURSE_ROOT / "curriculum.json").read_text())
    lessons = build_course(curriculum)
    destination = COURSE_ROOT / "lessons" / "en"
    destination.mkdir(parents=True, exist_ok=True)
    for lesson in lessons:
        filename = destination / f"{lesson['lesson']['slug']}.json"
        filename.write_text(json.dumps(lesson, indent=2, ensure_ascii=False) + "\n")
    graph = {
        "title": curriculum["title"], "locale": "en",
        "concepts": [{key: concept[key] for key in ("slug", "name", "kind", "tier")} for concept in curriculum["concepts"]],
        "edges": [{"from": edge["parent"], "to": edge["child"], "strength": edge["kind"], "reason": edge["reason"]} for edge in curriculum["edges"]],
    }
    (COURSE_ROOT / "subject-import.json").write_text(json.dumps(graph, indent=2) + "\n")
    print(f"Built {len(lessons)} English lesson fixtures")


if __name__ == "__main__":
    write_course()
