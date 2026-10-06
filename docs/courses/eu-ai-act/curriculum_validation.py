"""Validate the review draft without changing Flashkarte content."""

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

COURSE_ROOT = Path(__file__).resolve().parent
ANNEX_III_POINTS = {"2"} | {
    f"{number}({letter})"
    for number, letters in {1: "abc", 3: "abcd", 4: "ab", 5: "abcd", 6: "abcde", 7: "abcd", 8: "ab"}.items()
    for letter in letters
}
CRITICAL_PROVISIONS = {
    "Article 6(1a)", "Article 6(1b)", "Article 6(1c)",
    "Article 6(3), final subparagraph", "Article 6(4), sentence 2",
    "Article 5(1)(ba)", "Article 5(1)(bb)", "Article 5(1b)",
    "Article 5(1a)(a)(i)", "Article 5(1a)(a)(ii)", "Article 5(1a)(b)",
    "Article 5(3), second subparagraph, final sentence",
    "Annex I Section A(1), deleted", "Annex I Section B(21)",
}
ARTICLE_6_PROVISIONS = {
    "Article 6(1), opening", "Article 6(1)(a)", "Article 6(1)(b)",
    "Article 6(1a)", "Article 6(1b)", "Article 6(1c)", "Article 6(2)",
    "Article 6(3), first subparagraph", "Article 6(3), second subparagraph, opening",
    "Article 6(3), final subparagraph",
} | {f"Article 6(3)({letter})" for letter in "abcd"} | {
    f"Article 6(4), sentence {number}" for number in range(1, 4)
} | {f"Article 6({number})" for number in range(5, 9)}
ARTICLE_5_PROVISIONS = {
    "Article 5(1), opening", "Article 5(1)(c), opening",
    "Article 5(1)(c)(i)", "Article 5(1)(c)(ii)", "Article 5(1)(h), opening",
    "Article 5(1), second subparagraph", "Article 5(1a)(a), opening",
    "Article 5(1a)(a)(i)", "Article 5(1a)(a)(ii)", "Article 5(1a)(b)", "Article 5(1b)",
    "Article 5(2), first subparagraph, opening", "Article 5(2)(a)", "Article 5(2)(b)",
    "Article 5(2), second subparagraph", "Article 5(3), first subparagraph",
    "Article 5(3), second subparagraph, authorisation test",
    "Article 5(3), second subparagraph, final sentence",
} | {f"Article 5(1)({point})" for point in ("a", "b", "ba", "bb", "d", "e", "f", "g")} | {
    f"Article 5(1)(h)({point})" for point in ("i", "ii", "iii")
} | {f"Article 5({number})" for number in range(4, 9)}


def read_package(root=COURSE_ROOT):
    filenames = ("curriculum.json", "coverage.json", "source-register.json")
    return tuple(json.loads((root / filename).read_text()) for filename in filenames)


def find_cycles(node_ids, edges):
    children = defaultdict(list)
    for parent, child in edges:
        children[parent].append(child)
    visited, active, cycles = set(), set(), []

    def visit(node):
        if node in active:
            cycles.append(f"Cycle at {node}")
            return
        if node in visited:
            return
        active.add(node)
        for child in children[node]:
            visit(child)
        active.remove(node)
        visited.add(node)

    for node in node_ids:
        visit(node)
    return cycles


def derive_prerequisites(curriculum):
    lesson_order = {lesson["id"]: index for index, lesson in enumerate(curriculum["lessons"])}
    owners = {slug: lesson["id"] for lesson in curriculum["lessons"] for slug in lesson["covers"]}
    reasons = defaultdict(lambda: defaultdict(list))
    for edge in curriculum["edges"]:
        if edge["kind"] != "requires":
            continue
        parent, child = owners.get(edge["parent"]), owners.get(edge["child"])
        if parent and child and parent != child:
            reasons[child][parent].append(edge["reason"])
    return {
        lesson["id"]: [
            {"lesson_id": parent, "reason": " ".join(dict.fromkeys(reasons[lesson["id"]][parent]))}
            for parent in sorted(reasons[lesson["id"]], key=lesson_order.get)
        ]
        for lesson in curriculum["lessons"]
    }


def check_identifiers(curriculum):
    errors = []
    for collection, field in (("concepts", "slug"), ("lessons", "id"), ("modules", "id")):
        duplicates = [key for key, count in Counter(entry[field] for entry in curriculum[collection]).items() if count > 1]
        errors.extend(f"Duplicate {collection} identifier: {key}" for key in duplicates)
    concepts = {concept["slug"] for concept in curriculum["concepts"]}
    coverage = Counter(slug for lesson in curriculum["lessons"] for slug in lesson["covers"])
    errors.extend(f"Concept must be covered once: {slug}" for slug in concepts if coverage[slug] != 1)
    errors.extend(f"Unknown covered concept: {slug}" for slug in coverage.keys() - concepts)
    return errors


def check_lessons(curriculum):
    errors, concepts = [], {concept["slug"]: concept for concept in curriculum["concepts"]}
    module_ids = {module["id"] for module in curriculum["modules"]}
    core_by_module = defaultdict(list)
    for lesson in curriculum["lessons"]:
        if lesson["module"] not in module_ids:
            errors.append(f"Unknown module: {lesson['id']}")
        if not 1 <= len(lesson["covers"]) <= 3:
            errors.append(f"Lesson must cover 1-3 concepts: {lesson['id']}")
        if lesson["tier"] == "core":
            core_by_module[lesson["module"]].append(lesson["id"])
        for slug in lesson["covers"]:
            if slug in concepts and concepts[slug]["tier"] != lesson["tier"]:
                errors.append(f"Concept/lesson tier mismatch: {slug}")
    for lesson in curriculum["lessons"]:
        has_capstone = any(concepts.get(slug, {}).get("kind") == "capstone" for slug in lesson["covers"])
        if has_capstone and lesson["id"] != core_by_module[lesson["module"]][-1]:
            errors.append(f"Capstone must finish the core module: {lesson['id']}")
    for module_id in module_ids:
        count = sum(lesson["module"] == module_id for lesson in curriculum["lessons"])
        if not 3 <= count <= 8:
            errors.append(f"Module must contain 3-8 lessons: {module_id}")
    return errors


def check_edges(curriculum):
    errors, parents = [], defaultdict(list)
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    positions = {slug: (index, offset) for index, lesson in enumerate(curriculum["lessons"]) for offset, slug in enumerate(lesson["covers"])}
    seen = set()
    for edge in curriculum["edges"]:
        parent, child, kind = edge["parent"], edge["child"], edge["kind"]
        identity = (parent, child, kind)
        if identity in seen:
            errors.append(f"Duplicate edge: {identity}")
        seen.add(identity)
        if parent not in concepts or child not in concepts:
            errors.append(f"Unknown edge endpoint: {identity}")
            continue
        if kind not in {"requires", "suggests"} or not edge["reason"].strip():
            errors.append(f"Invalid edge kind/reason: {identity}")
        if kind == "requires":
            parents[child].append(parent)
            if concepts[child]["kind"] == "map":
                errors.append(f"Map must be ungated: {child}")
            if concepts[parent]["tier"] == "extension" and concepts[child]["tier"] == "core":
                errors.append(f"Extension gates core: {identity}")
            if positions.get(parent, (999, 0)) >= positions.get(child, (-1, 0)):
                errors.append(f"Required concept must be taught earlier: {identity}")
    errors.extend(f"Too many required parents: {child}" for child, incoming in parents.items() if len(incoming) > 4)
    errors.extend(find_cycles(concepts, [(edge["parent"], edge["child"]) for edge in curriculum["edges"]]))
    return errors


def check_prerequisites(curriculum):
    expected, errors = derive_prerequisites(curriculum), []
    for lesson in curriculum["lessons"]:
        if lesson["prerequisites"] != expected[lesson["id"]]:
            errors.append(f"Derived prerequisites differ: {lesson['id']}")
    lesson_edges = [(parent["lesson_id"], lesson["id"]) for lesson in curriculum["lessons"] for parent in lesson["prerequisites"]]
    return errors + find_cycles(expected, lesson_edges)


def check_coverage(curriculum, coverage, sources):
    lessons = {lesson["id"] for lesson in curriculum["lessons"]}
    source_ids = {source["id"] for source in sources["sources"]}
    locators = {entry["locator"] for entry in coverage["coverage"]}
    expected = CRITICAL_PROVISIONS | ARTICLE_5_PROVISIONS | ARTICLE_6_PROVISIONS
    expected |= {f"Annex III({point})" for point in ANNEX_III_POINTS}
    errors = [f"Missing provision coverage: {locator}" for locator in sorted(expected - locators)]
    for entry in coverage["coverage"]:
        if entry["lesson"] not in lessons or entry["source_id"] not in source_ids:
            errors.append(f"Unknown coverage reference: {entry['locator']}")
        if entry["status"] != "planned-not-yet-taught":
            errors.append(f"Review draft overstates teaching status: {entry['locator']}")
    for concept in curriculum["concepts"]:
        if not concept.get("assessment") or not concept.get("source_locator") or not concept.get("source_ids"):
            errors.append(f"Missing concept assessment/source: {concept['slug']}")
        if set(concept.get("source_ids", [])) - source_ids:
            errors.append(f"Unknown concept source: {concept['slug']}")
    if coverage["baseline"] != sources["baseline"]:
        errors.append("Coverage/source baseline mismatch")
    if curriculum.get("source_baseline") != sources["baseline"]:
        errors.append("Curriculum/source baseline mismatch")
    return errors


def check_source_files(sources, root=COURSE_ROOT):
    errors = []
    for source in sources["sources"]:
        if not source.get("file"):
            continue
        path = root / source["file"]
        if not path.is_file():
            errors.append(f"Missing retained source: {source['id']}")
        elif hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]:
            errors.append(f"Source hash mismatch: {source['id']}")
    return errors


def validate_package(curriculum, coverage, sources):
    return (check_identifiers(curriculum) + check_lessons(curriculum) + check_edges(curriculum)
            + check_prerequisites(curriculum) + check_coverage(curriculum, coverage, sources))


if __name__ == "__main__":
    curriculum, coverage, sources = read_package()
    failures = validate_package(curriculum, coverage, sources) + check_source_files(sources)
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Valid review draft: {len(curriculum['lessons'])} lessons, {len(curriculum['concepts'])} concepts, "
          f"{len(curriculum['edges'])} edges, {len(coverage['coverage'])} coverage rows.")
