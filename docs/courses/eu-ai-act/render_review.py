"""Render readable review tables from the canonical course registers."""

import sys
from pathlib import Path

from curriculum_validation import COURSE_ROOT, read_package, validate_package


def markdown_cell(content):
    return str(content).replace("|", "\\|").replace("\n", " ")


def markdown_table(headers, rows):
    cells = [headers] + [[markdown_cell(cell) for cell in row] for row in rows]
    widths = [max(3, *(len(row[index]) for row in cells)) for index in range(len(headers))]
    cells.insert(1, ["-" * width for width in widths])
    lines = ["| " + " | ".join(cell.ljust(width) for cell, width in zip(row, widths)) + " |" for row in cells]
    return "\n".join(lines)


def render_lesson_table(lessons, concepts):
    return markdown_table(
        ["ID", "Lesson", "Concepts taught here", "Requires lessons"],
        [(lesson["id"], lesson["title"] + (" (extension)" if lesson["tier"] == "extension" else ""),
          "; ".join(concepts[slug]["name"] for slug in lesson["covers"]),
          ", ".join(parent["lesson_id"] for parent in lesson["prerequisites"]) or "None")
         for lesson in lessons],
    )


def render_graph(curriculum):
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    lines = ["# Concept graph for review", "", "Status: proposed graph; no lessons imported or taught.", "",
             "Every concept is taught once. `requires` gates understanding; `suggests` provides helpful context without gating. "
             "The reasons below are proposals for Chris's review, not platform lint results. "
             "Intra-lesson prerequisites are taught in the order listed. P06 and R04 are extensions; core learning does not depend on them.", ""]
    for module in curriculum["modules"]:
        lessons = [lesson for lesson in curriculum["lessons"] if lesson["module"] == module["id"]]
        lines += [f"## {module['id']} — {module['title']}", "", render_lesson_table(lessons, concepts), ""]
        for lesson in lessons:
            lines += [f"### {lesson['id']} — {lesson['title']}", ""]
            for slug in lesson["covers"]:
                concept = concepts[slug]
                lines += [f"**`{slug}`** ({concept['kind']}, {concept['tier']}): {concept['assessment']}", "",
                          f"Source: {concept['source_locator']} — {', '.join(concept['source_ids'])}.", ""]
                incoming = [edge for edge in curriculum["edges"] if edge["child"] == slug]
                if incoming:
                    lines += [markdown_table(["Edge", "Parent concept", "Reason"],
                              [(edge["kind"], edge["parent"], edge["reason"]) for edge in incoming]), ""]
                else:
                    lines += ["No incoming edges.", ""]
    return "\n".join(lines)


def render_coverage(coverage):
    introduction = ["# Provision coverage register", "", f"Baseline: {coverage['baseline']}. All rows are **planned, not yet taught**.", "",
                    "Primary means the lesson will assess that rule. Lookup means the lesson will teach the "
                    "lookup rather than the whole incorporated instrument. Context/orientation means a limited "
                    "cross-reference, not a claim of complete coverage. Annex I sector laws, Annex II offences "
                    "and national procedures require their own source reading before cases are written.", ""]
    table = markdown_table(["Provision", "Lesson", "Extent", "Coverage target", "Source"],
                           [(entry["locator"], entry["lesson"], entry["extent"], entry["topic"], entry["source_id"])
                            for entry in coverage["coverage"]])
    return "\n".join(introduction + [table, ""])


def render_sources(sources):
    lines = ["# Source register", "", f"Checked: {sources['checked_on']}. Working baseline: {sources['baseline']}.", "",
             "Official Journal acts have legal authority. Consolidated PDFs are the working reference and have "
             "a documentation-only notice. Retention and a hash confirm the file used; they do not prove that "
             "every page was reviewed. Reading limits are recorded below.", ""]
    for source in sources["sources"]:
        url = f"<{source['url']}>" if "(" in source["url"] else source["url"]
        lines += [f"## {source['id']} — {source['title']} ({source['language']})", "",
                  f"[Official source]({url}). Status: **{source['status']}**.", "",
                  f"Reading: {source['reading_status']}", "",
                  f"Version: {source.get('version') or 'See publication page'}. Publication: {source.get('publication_date') or 'Not recorded'}. "
                  f"Checked: {source['checked_on']}.", "",
                  f"Lesson targets: {', '.join(source['lessons'])}.", ""]
        if source.get("file"):
            lines += [f"Retained: [{source['file']}]({source['file']}). SHA-256: `{source['sha256']}`.", ""]
    return "\n".join(lines)


def render_outline(curriculum):
    concepts = {concept["slug"]: concept for concept in curriculum["concepts"]}
    lines = ["# First-release lesson outline", "", "English canonical; German and Czech first. "
             "52 lessons, eight modules. Draft lesson boundaries; no lesson content has been imported.", "",
             "Teaching order: introduction → Article 6 → Article 5. An early prohibition precheck "
             "prevents treating a forbidden practice as merely high-risk, while detailed Article 5 teaching comes later.", ""]
    for module in curriculum["modules"]:
        lines += [f"## {module['id']} — {module['title']}", "",
                  render_lesson_table([lesson for lesson in curriculum["lessons"] if lesson["module"] == module["id"]], concepts), ""]
    return "\n".join(lines)


def build_documents(curriculum, coverage, sources):
    return {"lesson-outline.md": render_outline(curriculum), "concept-graph.md": render_graph(curriculum),
            "coverage.md": render_coverage(coverage), "source-register.md": render_sources(sources)}


def write_documents(documents, root=COURSE_ROOT, check=False):
    mismatches = []
    for filename, content in documents.items():
        path = root / filename
        if check:
            if not path.is_file() or path.read_text() != content:
                mismatches.append(filename)
        else:
            path.write_text(content)
    return mismatches


if __name__ == "__main__":
    curriculum, coverage, sources = read_package()
    failures = validate_package(curriculum, coverage, sources)
    if failures:
        raise SystemExit("\n".join(failures))
    mismatches = write_documents(build_documents(curriculum, coverage, sources), check="--check" in sys.argv)
    if mismatches:
        raise SystemExit("Stale review documents: " + ", ".join(mismatches))
    print("Review documents match the canonical registers.")
