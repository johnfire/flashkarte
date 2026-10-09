"""Guard the legal scope, prerequisite graph and review-document delivery flow."""

import copy
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from curriculum_validation import check_source_files, read_package
from conformity_review import (
    PLAN_ROOT, build_documents, check_plan_coverage, expected_provisions,
    main, render_concept, render_coverage, render_graph, render_outline, validate_plan,
)
from render_review import write_documents


class ConformityReviewTests(unittest.TestCase):
    def setUp(self):
        self.curriculum, self.coverage, self.sources = copy.deepcopy(read_package(PLAN_ROOT))

    def test_complete_plan_and_retained_source_are_consistent(self):
        self.assertEqual([], validate_plan(self.curriculum, self.coverage, self.sources))
        self.assertEqual([], check_source_files(self.sources, PLAN_ROOT))
        self.assertEqual(30, len(self.curriculum["lessons"]))
        self.assertEqual(64, len(self.curriculum["concepts"]))
        self.assertEqual(221, len(self.coverage["coverage"]))

    def test_all_article_and_annex_targets_are_required(self):
        expected = expected_provisions()
        for locator in ("Article 28(9)", "Article 31(12)", "Article 36(9)", "Article 41(6)",
                        "Article 43(6)", "Article 46(7)", "Annex IV(2(f))", "Annex V(8)",
                        "Annex VI(4)", "Annex VII(5.3)", "Annex VIII(C)(5)", "Annex XIV(3(d))"):
            self.assertIn(locator, expected)
        self.coverage["coverage"] = [entry for entry in self.coverage["coverage"]
                                     if entry["locator"] != "Article 36(9)"]
        self.assertIn("Missing provision: Article 36(9)",
                      check_plan_coverage(self.curriculum, self.coverage, self.sources))

    def test_deleted_registration_fields_cannot_silently_disappear(self):
        self.coverage["coverage"] = [entry for entry in self.coverage["coverage"]
                                     if entry["locator"] != "Annex VIII(B)(9)"]
        failures = check_plan_coverage(self.curriculum, self.coverage, self.sources)
        self.assertIn("Missing provision: Annex VIII(B)(9)", failures)
        self.assertIn("Deleted", render_coverage(read_package(PLAN_ROOT)[1]))

    def test_critical_assessment_branch_move_requires_review(self):
        for entry in self.coverage["coverage"]:
            if entry["locator"] == "Article 43(2)":
                entry["lesson"] = "F20"
        self.assertIn("Critical decision moved without review: Article 43(2)",
                      check_plan_coverage(self.curriculum, self.coverage, self.sources))

    def test_missing_reference_extent_and_duplicate_are_rejected(self):
        first = self.coverage["coverage"][0]
        first["source_id"] = "unknown-source"
        first["extent"] = "everything"
        self.coverage["coverage"].append(first.copy())
        failures = check_plan_coverage(self.curriculum, self.coverage, self.sources)
        self.assertTrue(any("Unknown coverage reference" in failure for failure in failures))
        self.assertTrue(any("coverage boundary" in failure for failure in failures))
        self.assertTrue(any("Duplicate provision" in failure for failure in failures))

    def test_teaching_status_and_baseline_cannot_be_overstated(self):
        self.curriculum["status"] = "imported"
        self.curriculum["source_baseline"] = "old-baseline"
        self.coverage["coverage"][0]["status"] = "taught"
        failures = check_plan_coverage(self.curriculum, self.coverage, self.sources)
        self.assertTrue(any("overstates teaching" in failure for failure in failures))
        self.assertIn("Plan/source baseline mismatch", failures)
        self.assertIn("Plan status changed without review", failures)

    def test_unsourced_or_unassessed_concept_is_rejected(self):
        self.curriculum["concepts"][0]["assessment"] = ""
        self.curriculum["concepts"][1]["source_ids"] = ["missing"]
        failures = validate_plan(self.curriculum, self.coverage, self.sources)
        self.assertTrue(any("Missing concept assessment/source" in failure for failure in failures))
        self.assertTrue(any("Unknown concept source" in failure for failure in failures))

    def test_invalid_prerequisite_and_cycle_are_rejected(self):
        self.curriculum["lessons"][2]["prerequisites"] = []
        self.curriculum["edges"].append({"parent": "market-release-case", "child": "high-risk-route",
                                          "kind": "requires", "reason": "Invalid backward prerequisite"})
        failures = validate_plan(self.curriculum, self.coverage, self.sources)
        self.assertTrue(any("taught earlier" in failure for failure in failures))
        self.assertTrue(any("Cycle" in failure for failure in failures))
        self.assertTrue(any("Derived prerequisites differ" in failure for failure in failures))

    def test_graph_preserves_assessment_source_and_edge_reasons(self):
        graph = render_graph(self.curriculum)
        for concept in self.curriculum["concepts"]:
            self.assertIn(concept["assessment"], graph)
            self.assertIn(concept["source_locator"], graph)
        for edge in self.curriculum["edges"]:
            self.assertIn(edge["reason"], graph)
        ungated = render_concept(self.curriculum["concepts"][0], self.curriculum["edges"])
        self.assertIn("No incoming prerequisite edges.", ungated)

    def test_outline_and_coverage_expose_review_boundaries(self):
        outline = render_outline(self.curriculum)
        for lesson in self.curriculum["lessons"]:
            self.assertIn(lesson["title"], outline)
        rendered_coverage = render_coverage(self.coverage)
        self.assertIn("authored in testing", rendered_coverage)
        self.assertIn("remaining reference to deleted B9", rendered_coverage)
        self.assertIn("221 targets", rendered_coverage)

    def test_authored_status_requires_recorded_owner_approval(self):
        self.curriculum.pop("owner_approval")
        self.assertIn("Plan status changed without review",
                      check_plan_coverage(self.curriculum, self.coverage, self.sources))

    def test_render_and_stale_check_delivery_flow(self):
        documents = build_documents(self.curriculum, self.coverage, self.sources)
        self.assertEqual({"lesson-outline.md", "concept-graph.md", "coverage.md", "source-register.md"},
                         set(documents))
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual([], write_documents(documents, root))
            self.assertEqual([], write_documents(documents, root, check=True))
            (root / "lesson-outline.md").write_text("Stale draft")
            self.assertEqual(["lesson-outline.md"], write_documents(documents, root, check=True))

    def test_main_rejects_invalid_plan_without_writing(self):
        import json
        self.curriculum["concepts"][0]["assessment"] = ""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for filename, register in zip(("curriculum.json", "coverage.json", "source-register.json"),
                                          (self.curriculum, self.coverage, self.sources)):
                (root / filename).write_text(json.dumps(register))
            with self.assertRaisesRegex(SystemExit, "Missing concept assessment/source"):
                main([], root)
            self.assertFalse((root / "lesson-outline.md").exists())

    def test_cli_checks_saved_review_package(self):
        completed = subprocess.run([sys.executable, str(PLAN_ROOT.parent / "conformity_review.py"), "--check"],
                                   capture_output=True, text=True, check=False)
        self.assertEqual(0, completed.returncode, completed.stderr)
        self.assertIn("Valid conformity plan: 30 lessons", completed.stdout)


if __name__ == "__main__":
    unittest.main()
