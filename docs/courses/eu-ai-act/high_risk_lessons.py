"""Build the owner-approved high-risk course from its reviewed graph and lessons."""

import json
import re
import sys
from pathlib import Path

from curriculum_validation import check_edges, check_identifiers, check_lessons, check_prerequisites, derive_prerequisites
from lesson_builder import build_course
from lesson_validation import check_course

ROOT = Path(__file__).resolve().parent / "high-risk-compliance"


def table_rows(filename):
    return [[cell.strip() for cell in line.strip().strip("|").split("|")]
            for line in (ROOT / filename).read_text().splitlines() if line.startswith("|")]


def read_approved_plan():
    concepts, edges, homes = [], [], {}
    rows = [row for row in table_rows("concept-graph.md") if re.fullmatch(r"C\d+ / H\d+", row[0])]
    identifiers = {row[0].split(" / ")[0]: row[1] for row in rows}
    for identifier, slug, kind, assessment, parents in rows:
        concept_id, home = identifier.split(" / ")
        homes[slug] = home
        concepts.append({"id": concept_id, "slug": slug, "name": slug.replace("-", " ").capitalize(),
                         "kind": kind, "tier": "extension" if home == "H29" else "core", "assessment": assessment})
        for parent, reason in re.findall(r"(C\d+) — ([^;]+)", parents):
            edges.append({"parent": identifiers[parent], "child": slug, "kind": "requires", "reason": reason.strip()})
    for row in table_rows("concept-graph.md"):
        match = re.fullmatch(r"(C\d+) → (C\d+)", row[0])
        if match:
            edges.append({"parent": identifiers[match[1]], "child": identifiers[match[2]], "kind": "suggests", "reason": row[1]})
    modules = [{"id": f"H{index}", "title": title} for index, title in enumerate(
        re.findall(r"^## Module \d+ — (.+)$", (ROOT / "lesson-outline.md").read_text(), re.M))]
    lessons = [{"id": row[0], "title": row[1], "module": f"H{(int(row[0][1:]) - 1) // 6}",
                "tier": "extension" if row[0] == "H29" else "core",
                "covers": [slug for slug, home in homes.items() if home == row[0]]}
               for row in table_rows("lesson-outline.md") if re.fullmatch(r"H\d+", row[0])]
    curriculum = {"schema_version": 1, "title": "EU AI Act: High-risk compliance in practice",
                  "checked_on": "2026-10-07", "status": "owner-approved-authored-testing", "canonical_language": "en",
                  "source_baseline": "02024R1689-20260727", "modules": modules, "concepts": concepts, "edges": edges, "lessons": lessons}
    prerequisites = derive_prerequisites(curriculum)
    for lesson in lessons:
        lesson["prerequisites"] = prerequisites[lesson["id"]]
    return curriculum


def graph_import(curriculum):
    return {"title": curriculum["title"], "locale": "en",
            "description": "30 English lessons for Chris's first-student review: high-risk controls, data, technical evidence, supply-chain and deployment duties. Private editable testing draft; legal baseline checked 7 October 2026.",
            "concepts": [{key: concept[key] for key in ("slug", "name", "kind", "tier")} for concept in curriculum["concepts"]],
            "edges": [{"from": edge["parent"], "to": edge["child"], "strength": edge["kind"], "reason": edge["reason"]} for edge in curriculum["edges"]]}


def validate(curriculum, fixtures):
    return (check_identifiers(curriculum) + check_lessons(curriculum)
            + check_edges(curriculum) + check_prerequisites(curriculum) + check_course(curriculum, fixtures))


def main():
    curriculum = read_approved_plan()
    fixtures = build_course(curriculum)
    if "--check" in sys.argv:
        saved = json.loads((ROOT / "curriculum.json").read_text())
        if saved != curriculum or json.loads((ROOT / "subject-import.json").read_text()) != graph_import(curriculum):
            raise SystemExit("Saved graph or curriculum differs from the approved plan")
        fixtures = [json.loads((ROOT / "lessons" / "en" / f"{lesson['id'].lower()}.json").read_text()) for lesson in curriculum["lessons"]]
    failures = validate(curriculum, fixtures)
    if failures:
        raise SystemExit("\n".join(failures))
    if "--check" not in sys.argv:
        destination = ROOT / "lessons" / "en"
        destination.mkdir(parents=True, exist_ok=True)
        for filename, course_content in [(ROOT / "curriculum.json", curriculum), (ROOT / "subject-import.json", graph_import(curriculum))] + [(destination / f"{fixture['lesson']['slug']}.json", fixture) for fixture in fixtures]:
            filename.write_text(json.dumps(course_content, indent=2, ensure_ascii=False) + "\n")
    print(f"Validated {len(fixtures)} lessons, {sum(len(f['screens']) for f in fixtures)} screens, {sum(len(f['questions']) for f in fixtures)} questions with retests")


if __name__ == "__main__":
    main()
