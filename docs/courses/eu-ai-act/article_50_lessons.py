"""Build or verify the dedicated Article 50 fixtures without contacting the service."""

import json
import sys

from article_50_validation import ARTICLE_50_ROOT, read_article_50_package
from lesson_builder import build_course
from lesson_validation import check_course


def read_article_50_fixtures(curriculum):
    return [json.loads((ARTICLE_50_ROOT / "lessons" / "en" / f"{lesson['id'].lower()}.json").read_text())
            for lesson in curriculum["lessons"]]


def build_article_50_graph(curriculum):
    return {
        "title": curriculum["title"], "locale": "en",
        "concepts": [{key: concept[key] for key in ("slug", "name", "kind", "tier")} for concept in curriculum["concepts"]],
        "edges": [{"from": edge["parent"], "to": edge["child"], "strength": edge["kind"], "reason": edge["reason"]} for edge in curriculum["edges"]],
    }


def check_article_50_graph(curriculum, graph):
    return ([] if graph == build_article_50_graph(curriculum)
            else ["Article 50 import graph differs from its approved curriculum"])


def write_article_50_fixtures(curriculum):
    fixtures = build_course(curriculum)
    destination = ARTICLE_50_ROOT / "lessons" / "en"
    destination.mkdir(parents=True, exist_ok=True)
    for fixture in fixtures:
        filename = destination / f"{fixture['lesson']['slug']}.json"
        filename.write_text(json.dumps(fixture, indent=2, ensure_ascii=False) + "\n")
    graph = build_article_50_graph(curriculum)
    (ARTICLE_50_ROOT / "subject-import.json").write_text(json.dumps(graph, indent=2) + "\n")
    return fixtures


def main():
    curriculum, _ = read_article_50_package()
    fixtures = (read_article_50_fixtures(curriculum) if "--check" in sys.argv
                else write_article_50_fixtures(curriculum))
    graph = json.loads((ARTICLE_50_ROOT / "subject-import.json").read_text())
    failures = check_course(curriculum, fixtures) + check_article_50_graph(curriculum, graph)
    if failures:
        raise SystemExit("\n".join(failures))
    screens = sum(len(fixture["screens"]) for fixture in fixtures)
    questions = sum(len(fixture["questions"]) for fixture in fixtures)
    print(f"Validated {len(fixtures)} Article 50 lessons, {screens} screens, {questions} questions with retests")


if __name__ == "__main__":
    main()
