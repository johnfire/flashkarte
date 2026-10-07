"""Build and validate the approved English conformity teaching package."""

import json
import sys

from conformity_review import PLAN_ROOT, validate_plan
from curriculum_validation import check_source_files, read_package
from lesson_builder import build_course
from lesson_validation import check_course


def graph_import(curriculum):
    return {"title": curriculum["title"], "locale": "en",
            "description": "30 English lessons on EU AI Act conformity and market access: assessment routes, standards, assessor scope, certificates, declarations, CE marking and registration. Community learning draft, editable for first-student review. Legal baseline checked 7 October 2026; bounded education, not product certification.",
            "concepts": [{key: concept[key] for key in ("slug", "name", "kind", "tier")}
                         for concept in curriculum["concepts"]],
            "edges": [{"from": edge["parent"], "to": edge["child"], "strength": edge["kind"],
                       "reason": edge["reason"]} for edge in curriculum["edges"]]}


def validate(curriculum, coverage, sources, fixtures):
    return (validate_plan(curriculum, coverage, sources) + check_source_files(sources, PLAN_ROOT)
            + check_course(curriculum, fixtures))


def saved_fixtures(curriculum, root=PLAN_ROOT):
    return [json.loads((root / "lessons" / "en" / f"{lesson['id'].lower()}.json").read_text())
            for lesson in curriculum["lessons"]]


def main(arguments, root=PLAN_ROOT):
    curriculum, coverage, sources = read_package(root)
    fixtures = saved_fixtures(curriculum, root) if "--check" in arguments else build_course(curriculum)
    failures = validate(curriculum, coverage, sources, fixtures)
    if "--check" in arguments and json.loads((root / "subject-import.json").read_text()) != graph_import(curriculum):
        failures.append("Saved subject import differs from the approved curriculum")
    if failures:
        raise SystemExit("\n".join(failures))
    if "--check" not in arguments:
        destination = root / "lessons" / "en"
        destination.mkdir(parents=True, exist_ok=True)
        documents = [(root / "subject-import.json", graph_import(curriculum))]
        documents += [(destination / f"{fixture['lesson']['slug']}.json", fixture) for fixture in fixtures]
        for filename, content in documents:
            filename.write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n")
    print(f"Validated {len(fixtures)} conformity lessons, {sum(len(f['screens']) for f in fixtures)} screens, "
          f"{sum(len(f['questions']) for f in fixtures)} questions with retests")


if __name__ == "__main__":
    main(sys.argv[1:])
