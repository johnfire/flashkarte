"""Attach the registered primary and guidance sources used by each lesson."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "conformity-market-access"


def add_registered_sources(lessons):
    sources = json.loads((ROOT / "source-register.json").read_text())["sources"]
    curriculum = json.loads((ROOT / "curriculum.json").read_text())
    concept_sources = {concept["slug"]: concept["source_ids"] for concept in curriculum["concepts"]}
    lesson_sources = {lesson["id"]: {source for slug in lesson["covers"] for source in concept_sources[slug]}
                      for lesson in curriculum["lessons"]}
    return {identifier: {**content, "additional_sources": content["additional_sources"] + [
        {"title": source["title"], "url": source["url"]} for source in sources
        if source["id"] != "AI-C-EN"
        and (identifier in source["lessons"] or source["id"] in lesson_sources[identifier])
    ]} for identifier, content in lessons.items()}
