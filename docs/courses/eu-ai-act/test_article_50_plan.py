"""Regression checks for Article 50 review gates and curriculum consistency."""

import copy
import json
import tempfile
import unittest
from pathlib import Path

from article_50_review import render_article_50_coverage, render_article_50_graph
from article_50_validation import COURSE_ROOT, read_article_50_package, validate_article_50_package
from render_review import write_documents


class Article50PlanTests(unittest.TestCase):
    def setUp(self):
        self.curriculum, self.coverage = read_article_50_package()
        self.sources = json.loads((COURSE_ROOT / "source-register.json").read_text())

    def validate(self):
        return validate_article_50_package(self.curriculum, self.coverage, self.sources)

    def test_canonical_plan_is_valid(self):
        self.assertEqual(self.validate(), [])
        self.assertEqual(len(self.curriculum["lessons"]), 18)
        self.assertEqual(len(self.curriculum["concepts"]), 42)

    def test_missing_editorial_limb_is_rejected(self):
        self.coverage["coverage"] = [entry for entry in self.coverage["coverage"]
                                     if "editorial exception" not in entry["locator"]]
        self.assertTrue(any("Article 50(4)" in failure for failure in self.validate()))

    def test_stale_prerequisite_is_rejected(self):
        self.curriculum["lessons"][-1]["prerequisites"] = []
        self.assertTrue(any("Derived prerequisites differ" in failure for failure in self.validate()))

    def test_same_count_cannot_hide_missing_rule(self):
        self.coverage["coverage"][0]["locator"] = "Article 50(1), invented substitute"
        self.assertTrue(any("Missing Article 50 coverage" in failure for failure in self.validate()))

    def test_unknown_source_is_rejected(self):
        self.curriculum["concepts"][0]["source_ids"] = ["UNKNOWN"]
        self.assertTrue(any("Unknown concept source" in failure for failure in self.validate()))

    def test_duplicate_concept_teaching_is_rejected(self):
        self.curriculum["lessons"][1]["covers"].append("ai-system")
        self.assertTrue(any("covered once" in failure for failure in self.validate()))

    def test_cycle_is_rejected(self):
        edge = copy.deepcopy(self.curriculum["edges"][0])
        edge["parent"], edge["child"] = edge["child"], edge["parent"]
        self.curriculum["edges"].append(edge)
        self.assertTrue(any("Cycle" in failure for failure in self.validate()))

    def test_draft_cannot_claim_taught(self):
        self.coverage["coverage"][0]["status"] = "taught"
        self.assertTrue(any("overstates" in failure for failure in self.validate()))

    def test_rendered_review_includes_edges_and_can_detect_drift(self):
        graph = render_article_50_graph(self.curriculum)
        for edge in self.curriculum["edges"]:
            self.assertIn(edge["reason"], graph)
        documents = {"concept-graph.md": graph, "coverage.md": render_article_50_coverage(self.coverage)}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual(write_documents(documents, root), [])
            self.assertEqual(write_documents(documents, root, check=True), [])
            (root / "coverage.md").write_text("Stale")
            self.assertEqual(write_documents(documents, root, check=True), ["coverage.md"])


if __name__ == "__main__":
    unittest.main()
