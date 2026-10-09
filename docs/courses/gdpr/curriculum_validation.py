"""Check the GDPR concept graph and syllabus before any lesson is built."""

import json
import re
from collections import Counter
from pathlib import Path

import curriculum_plan

ROOT = Path(__file__).resolve().parent
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
KINDS = {"term", "idea", "skill", "map", "capstone", "assumption"}


def find_cycle(concepts, edges):
    children = {slug: [] for slug in concepts}
    for edge in edges:
        children[edge["parent"]].append(edge["child"])
    state = {}

    def visit(node, path):
        state[node] = "open"
        for child in children[node]:
            if state.get(child) == "open":
                return path + [child]
            if child not in state and (found := visit(child, path + [child])):
                return found
        state[node] = "done"
        return None

    for slug in concepts:
        if slug not in state and (found := visit(slug, [slug])):
            return found
    return None


def check_curriculum(plan):
    failures = []
    concepts = {concept["slug"]: concept for concept in plan["concepts"]}
    lessons = [lesson["id"] for lesson in plan["lessons"]]
    if len(concepts) != len(plan["concepts"]):
        failures.append("duplicate concept slug")
    for slug, concept in concepts.items():
        if not SLUG.match(slug) or concept["kind"] not in KINDS:
            failures.append(f"{slug}: bad slug or kind")
        if concept["lesson"] not in lessons:
            failures.append(f"{slug}: taught by an unknown lesson")
    for edge in plan["edges"]:
        if edge["parent"] not in concepts or edge["child"] not in concepts:
            failures.append(f"edge {edge['parent']} -> {edge['child']}: unknown concept")
            continue
        if edge["kind"] not in {"requires", "suggests"} or not edge["reason"].strip():
            failures.append(f"edge {edge['parent']} -> {edge['child']}: bad kind or missing reason")
        if edge["kind"] == "requires":
            parent, child = concepts[edge["parent"]], concepts[edge["child"]]
            if parent["tier"] == "extension" and child["tier"] == "core":
                failures.append(f"core {child['slug']} requires extension {parent['slug']}")
    if Counter((e["parent"], e["child"]) for e in plan["edges"]).most_common(1)[0][1] > 1:
        failures.append("duplicate edge")
    parents = Counter(e["child"] for e in plan["edges"] if e["kind"] == "requires")
    failures += [f"{slug}: more than 4 requires parents" for slug, count in parents.items() if count > 4]
    if cycle := find_cycle(concepts, [e for e in plan["edges"] if e["parent"] in concepts and e["child"] in concepts]):
        failures.append(f"cycle: {' -> '.join(cycle)}")
    for position, lesson in enumerate(plan["lessons"]):
        if not 1 <= len(lesson["covers"]) <= 3:
            failures.append(f"{lesson['id']}: must teach one to three concepts")
        earlier = set(lessons[:position])
        for prerequisite in lesson["prerequisites"]:
            if prerequisite["lesson_id"] not in earlier:
                failures.append(f"{lesson['id']}: prerequisite {prerequisite['lesson_id']} is not earlier")
    return failures


def main():
    plan = json.loads((ROOT / "curriculum.json").read_text())
    if plan != curriculum_plan.build():
        raise SystemExit("curriculum.json is stale: run python3 curriculum_plan.py")
    failures = check_curriculum(plan)
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Curriculum valid: {len(plan['lessons'])} lessons, {len(plan['concepts'])} concepts, {len(plan['edges'])} edges")


if __name__ == "__main__":
    main()
