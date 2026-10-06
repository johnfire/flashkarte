"""Check the standalone English Article 50 graph and its provision coverage."""

import json

from curriculum_validation import (
    COURSE_ROOT,
    check_edges,
    check_identifiers,
    check_lessons,
    check_prerequisites,
)

ARTICLE_50_ROOT = COURSE_ROOT / "article-50"
REQUIRED_PROVISIONS = {
    'Article 50(1), sentence 1, duty',
    'Article 50(1), sentence 1, obviousness',
    'Article 50(1), sentence 2, authorisation',
    'Article 50(1), sentence 2, public reporting',
    'Article 50(2), sentence 1, systems and modalities',
    'Article 50(2), sentence 1, marking and detection',
    'Article 50(2), sentence 2, four qualities',
    'Article 50(2), sentence 2, feasibility',
    'Article 50(2), sentence 3, standard editing',
    'Article 50(2), sentence 3, alteration',
    'Article 50(2), sentence 3, law enforcement',
    'Article 50(3), sentence 1, disclosure',
    'Article 50(3), sentence 1, personal data',
    'Article 50(3), sentence 2',
    'Article 50(4), subparagraph 1, sentence 1',
    'Article 50(4), subparagraph 1, sentence 2',
    'Article 50(4), subparagraph 1, sentence 3',
    'Article 50(4), subparagraph 2, sentence 1',
    'Article 50(4), subparagraph 2, sentence 2, law enforcement',
    'Article 50(4), subparagraph 2, sentence 2, editorial exception',
    'Article 50(5), sentence 1, presentation',
    'Article 50(5), sentence 1, timing',
    'Article 50(5), sentence 2',
    'Article 50(6), sentence 1',
    'Article 50(6), sentence 2',
    'Article 50(7), sentence 1',
    'Article 50(7), sentence 2',
    'Article 50(7), sentence 3',
}


def read_article_50_package(root=ARTICLE_50_ROOT):
    return tuple(json.loads((root / filename).read_text()) for filename in ("curriculum.json", "coverage.json"))


def check_article_50_coverage(curriculum, coverage, sources):
    errors = []
    lessons = {lesson["id"] for lesson in curriculum["lessons"]}
    source_ids = {source["id"] for source in sources["sources"]}
    locators = [entry["locator"] for entry in coverage["coverage"]]
    errors.extend(f"Missing Article 50 coverage: {locator}" for locator in sorted(REQUIRED_PROVISIONS - set(locators)))
    for entry in coverage["coverage"]:
        if entry["lesson"] not in lessons or entry["source_id"] not in source_ids:
            errors.append(f"Unknown coverage reference: {entry['locator']}")
        if entry["status"] != "planned-not-yet-taught":
            errors.append(f"Review draft overstates teaching status: {entry['locator']}")
    for concept in curriculum["concepts"]:
        if not concept.get("assessment") or not concept.get("source_locator"):
            errors.append(f"Missing assessment or source locator: {concept['slug']}")
        if not concept.get("source_ids") or set(concept["source_ids"]) - source_ids:
            errors.append(f"Unknown concept source: {concept['slug']}")
    return errors


def validate_article_50_package(curriculum, coverage, sources):
    checks = (check_identifiers, check_lessons, check_edges, check_prerequisites)
    errors = [failure for check in checks for failure in check(curriculum)]
    return errors + check_article_50_coverage(curriculum, coverage, sources)


if __name__ == "__main__":
    curriculum, coverage = read_article_50_package()
    sources = json.loads((COURSE_ROOT / "source-register.json").read_text())
    failures = validate_article_50_package(curriculum, coverage, sources)
    if failures:
        raise SystemExit("\n".join(failures))
    print("Article 50 graph and coverage checks passed.")
