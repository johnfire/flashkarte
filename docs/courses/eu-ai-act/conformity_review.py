"""Validate and render the owner-review plan for conformity and market access."""

import sys
from collections import Counter
from pathlib import Path

from curriculum_validation import (
    COURSE_ROOT, check_edges, check_identifiers, check_lessons,
    check_prerequisites, check_source_files, read_package,
)
from render_review import markdown_table, render_lesson_table, render_sources, write_documents

PLAN_ROOT = COURSE_ROOT / "conformity-market-access"
ARTICLE_PARAGRAPHS = {
    28: 9, 29: 4, 30: 5, 31: 12, 33: 4, 34: 3, 35: 2, 36: 9,
    37: 4, 38: 3, 40: 3, 41: 6, 42: 3, 43: 6, 44: 3, 45: 4,
    46: 7, 47: 5, 48: 5, 49: 5,
}
CRITICAL_TARGETS = {
    "Article 113, general rule": "F03", "Article 113(b)": "F03",
    "Article 113(c)": "F03", "Article 111(2)": "F03",
    "Article 43(1), mandatory Annex VII triggers": "F20",
    "Article 43(2)": "F19",
    "Article 43(3), transitional assessor power": "F14",
    "Article 43(3), final subparagraph": "F04",
    "Article 43(4)": "F23", "Annex VII(4.6), fifth paragraph": "F21",
    "Article 46(7)": "F25", "Article 48(4)": "F27",
    "Article 49(2)": "F28", "Article 49(3)": "F29",
    "Article 49(4)": "F29", "Article 49(5)": "F29",
    "Annex VIII(B)(7)": "F28", "Annex VIII(B)(9)": "F28",
    "Annex XIV(4)": "F13",
}


def expected_provisions():
    provisions = {"Article 32", "Article 39"} | set(CRITICAL_TARGETS)
    provisions |= {f"Article {article}({point})" for article, count in ARTICLE_PARAGRAPHS.items()
                   for point in range(1, count + 1)}
    provisions |= {f"Annex IV({major}({letter}))" for major in (1, 2) for letter in "abcdefgh"}
    provisions |= {f"Annex IV({point})" for point in range(3, 10)}
    provisions |= {f"Annex V({point})" for point in range(1, 9)}
    provisions |= {f"Annex VI({point})" for point in range(1, 5)}
    provisions |= {f"Annex VII({point})" for point in ("1", "2")}
    provisions |= {f"Annex VII({major}.{point})" for major, count in ((3, 4), (4, 7), (5, 3))
                   for point in range(1, count + 1)}
    provisions |= {f"Annex VIII({section})({point})" for section, count in (("A", 13), ("B", 9), ("C", 5))
                   for point in range(1, count + 1)}
    provisions |= {f"Annex XIV({point})" for point in ("1", "2(a)", "2(b)", "3(a)", "3(b)", "3(c)", "3(d)", "4")}
    return provisions


def check_plan_coverage(curriculum, coverage, sources):
    entries = coverage["coverage"]
    counts = Counter(entry["locator"] for entry in entries)
    errors = [f"Missing provision: {locator}" for locator in sorted(expected_provisions() - counts.keys())]
    errors += [f"Duplicate provision: {locator}" for locator, count in counts.items() if count > 1]
    lessons = {lesson["id"] for lesson in curriculum["lessons"]}
    source_ids = {source["id"] for source in sources["sources"]}
    for entry in entries:
        if entry["lesson"] not in lessons or entry["source_id"] not in source_ids:
            errors.append(f"Unknown coverage reference: {entry['locator']}")
        if entry["status"] != "planned-not-yet-taught":
            errors.append(f"Plan overstates teaching status: {entry['locator']}")
        if entry["extent"] not in {"primary", "context", "orientation", "lookup"} or not entry["topic"].strip():
            errors.append(f"Missing coverage boundary: {entry['locator']}")
        if entry["locator"] in CRITICAL_TARGETS and entry["lesson"] != CRITICAL_TARGETS[entry["locator"]]:
            errors.append(f"Critical decision moved without review: {entry['locator']}")
    for concept in curriculum["concepts"]:
        if not all(concept.get(field) for field in ("assessment", "source_locator", "source_ids")):
            errors.append(f"Missing concept assessment/source: {concept['slug']}")
        if set(concept.get("source_ids", [])) - source_ids:
            errors.append(f"Unknown concept source: {concept['slug']}")
    if coverage["baseline"] != sources["baseline"] or curriculum["source_baseline"] != sources["baseline"]:
        errors.append("Plan/source baseline mismatch")
    if curriculum["status"] != "owner-review-pending":
        errors.append("Plan status changed without review")
    return errors


def validate_plan(curriculum, coverage, sources):
    return (check_identifiers(curriculum) + check_lessons(curriculum) + check_edges(curriculum)
            + check_prerequisites(curriculum) + check_plan_coverage(curriculum, coverage, sources))


def render_outline(curriculum):
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    lines = ["# Conformity and market access — proposed lesson outline", "",
             "**English · 30 lessons · 5 modules · 64 concepts. Owner review pending.**", "",
             "Self-contained foundations are retaught. Cases compare fictional HR and medical-product releases, "
             "with biometric, critical-infrastructure and public-deployer variations. Each module ends with a practical decision.", "",
             "This is a syllabus, not imported teaching content. See [review scope and cases](README.md), "
             "[every concept and prerequisite reason](concept-graph.md), [provision coverage](coverage.md) "
             "and [reading limits](source-checks.md).", ""]
    for module in curriculum["modules"]:
        lessons = [lesson for lesson in curriculum["lessons"] if lesson["module"] == module["id"]]
        lines += [f"## {module['id']} — {module['title']}", "", render_lesson_table(lessons, concepts), ""]
        for lesson in lessons:
            outcomes = " ".join(concepts[slug]["assessment"] for slug in lesson["covers"])
            lines += [f"**{lesson['id']} decision:** {outcomes}", ""]
    return "\n".join(lines)


def render_concept(concept, edges):
    incoming = [edge for edge in edges if edge["child"] == concept["slug"]]
    lines = [f"**`{concept['slug']}`** ({concept['kind']}): {concept['assessment']}", "",
             f"Source: {concept['source_locator']} — {', '.join(concept['source_ids'])}.", ""]
    if incoming:
        lines += [markdown_table(["Edge", "Parent concept", "Reason"],
                  [(edge["kind"], edge["parent"], edge["reason"]) for edge in incoming]), ""]
    else:
        lines += ["No incoming prerequisite edges.", ""]
    return lines


def render_graph(curriculum):
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    lines = ["# Conformity and market access — concept graph for review", "",
             "**Proposed; owner review pending. No lessons authored or imported for this part.**", "",
             "`requires` means the learner needs the parent idea to understand the child. `suggests` is useful context "
             "and does not gate learning. Sequence alone creates no gate. The overview is ungated. "
             "Each concept is taught once; intra-lesson dependencies follow the listed concept order. "
             "Every incoming edge and its proposed reason appears below.", ""]
    for lesson in curriculum["lessons"]:
        lines += [f"## {lesson['id']} — {lesson['title']}", ""]
        for slug in lesson["covers"]:
            lines += render_concept(concepts[slug], curriculum["edges"])
    return "\n".join(lines)


def render_coverage(coverage):
    lines = ["# Conformity and market access — provision coverage plan", "",
             f"Baseline: **{coverage['baseline']}**. All {len(coverage['coverage'])} targets are **planned, not yet taught**.", "",
             "Primary = decision to teach and assess. Context = explain the specified provision without a standalone assessment "
             "for every subpoint. Orientation = bounded summary of a larger topic covered elsewhere. Lookup = learn to find and "
             "verify the applicable source, not a claim of full sector-law instruction. Paragraph mapping is not a legal audit.", "",
             "Deleted Annex VIII B points 7 and 9 are deliberately retained as deletion checks. "
             "Article 49(4)(b)'s remaining reference to deleted B9 is flagged for interpretation, not filled with invented content.", ""]
    rows = [(entry["locator"], entry["lesson"], entry["extent"], entry["topic"], entry["source_id"])
            for entry in coverage["coverage"]]
    return "\n".join(lines + [markdown_table(["Provision", "Lesson", "Extent", "Target", "Source"], rows), ""])


def build_documents(curriculum, coverage, sources):
    return {"lesson-outline.md": render_outline(curriculum), "concept-graph.md": render_graph(curriculum),
            "coverage.md": render_coverage(coverage), "source-register.md": render_sources(sources)}


def main(arguments, root=PLAN_ROOT):
    curriculum, coverage, sources = read_package(root)
    failures = validate_plan(curriculum, coverage, sources) + check_source_files(sources, root)
    if failures:
        raise SystemExit("\n".join(failures))
    mismatches = write_documents(build_documents(curriculum, coverage, sources), root, check="--check" in arguments)
    if mismatches:
        raise SystemExit("Stale conformity review documents: " + ", ".join(mismatches))
    print(f"Valid conformity plan: {len(curriculum['lessons'])} lessons, "
          f"{len(curriculum['concepts'])} concepts, {len(coverage['coverage'])} coverage targets.")


if __name__ == "__main__":
    main(sys.argv[1:])
