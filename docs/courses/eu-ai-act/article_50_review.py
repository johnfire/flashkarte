"""Render Article 50 review documents from its canonical registers."""

import json
import sys

from article_50_validation import ARTICLE_50_ROOT, COURSE_ROOT, read_article_50_package, validate_article_50_package
from render_review import markdown_table, render_lesson_table, write_documents


def render_article_50_graph(curriculum):
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    lines = ["# Article 50 concept graph", "", "Proposed graph for owner review; no lessons imported.", "",
             "Every concept is taught once. Required edges gate understanding; suggested edges provide optional context. "
             "Within each lesson, concepts are taught in their listed order. Each module ends in a case exercise.", ""]
    for module in curriculum["modules"]:
        lessons = [lesson for lesson in curriculum["lessons"] if lesson["module"] == module["id"]]
        lines += [f"## {module['title']}", "", render_lesson_table(lessons, concepts), ""]
        for lesson in lessons:
            lines += [f"### {lesson['id']}: {lesson['title']}", ""]
            for slug in lesson["covers"]:
                concept = concepts[slug]
                lines += [f"**{concept['name']}** (`{slug}`, {concept['kind']}): {concept['assessment']}", "",
                          f"Source: {concept['source_locator']} — {', '.join(concept['source_ids'])}.", ""]
                incoming = [edge for edge in curriculum["edges"] if edge["child"] == slug]
                lines += [markdown_table(["Edge", "Parent", "Reason"],
                          [(edge["kind"], edge["parent"], edge["reason"]) for edge in incoming]) if incoming
                          else "No prerequisites.", ""]
    return "\n".join(lines)


def render_article_50_coverage(coverage):
    return "\n".join([
        "# Article 50 coverage targets", "", "All targets are planned, not yet taught. Baseline: 02024R1689-20260727.", "",
        "Primary targets receive teaching and assessment. Lookup targets identify a boundary and where to check it; "
        "they do not teach entire incorporated laws. Source reading limits remain in the parent source register.", "",
        markdown_table(["Provision", "Lesson", "Extent", "Teaching target", "Source"],
                       [(entry["locator"], entry["lesson"], entry["extent"], entry["topic"], entry["source_id"])
                        for entry in coverage["coverage"]]), "",
    ])


if __name__ == "__main__":
    curriculum, coverage = read_article_50_package()
    sources = json.loads((COURSE_ROOT / "source-register.json").read_text())
    failures = validate_article_50_package(curriculum, coverage, sources)
    if failures:
        raise SystemExit("\n".join(failures))
    documents = {"concept-graph.md": render_article_50_graph(curriculum), "coverage.md": render_article_50_coverage(coverage)}
    mismatches = write_documents(documents, root=ARTICLE_50_ROOT, check="--check" in sys.argv)
    if mismatches:
        raise SystemExit("Stale Article 50 review documents: " + ", ".join(mismatches))
    print("Article 50 review documents match their registers.")
