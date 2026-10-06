"""Regression checks for structural failures in the proposed course graph."""

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from curriculum_validation import (
    ANNEX_III_POINTS, ARTICLE_5_PROVISIONS, ARTICLE_6_PROVISIONS,
    check_coverage, check_edges, check_identifiers, check_lessons,
    check_prerequisites, check_source_files, derive_prerequisites,
    find_cycles, read_package, validate_package,
)
from render_review import (
    build_documents, markdown_cell, markdown_table, render_coverage,
    render_graph, render_lesson_table, render_outline, render_sources, write_documents,
)


class CurriculumReviewTests(unittest.TestCase):
    def setUp(self):
        self.curriculum, self.coverage, self.sources = copy.deepcopy(read_package())

    def test_complete_package_is_consistent(self):
        self.assertEqual([], validate_package(self.curriculum, self.coverage, self.sources))
        self.assertEqual([], check_source_files(self.sources))
        self.assertEqual(52, len(self.curriculum["lessons"]))
        self.assertEqual(109, len(self.curriculum["concepts"]))

    def test_duplicate_concept_and_missing_teaching_are_rejected(self):
        self.curriculum["concepts"].append(self.curriculum["concepts"][0].copy())
        self.curriculum["lessons"][0]["covers"].pop()
        failures = check_identifiers(self.curriculum)
        self.assertTrue(any("Duplicate" in failure for failure in failures))
        self.assertTrue(any("covered once" in failure for failure in failures))

    def test_unknown_concept_is_rejected(self):
        self.curriculum["lessons"][0]["covers"].append("missing-concept")
        self.assertTrue(any("Unknown covered" in failure for failure in check_identifiers(self.curriculum)))

    def test_capstone_cannot_precede_later_core_lesson(self):
        self.curriculum["lessons"][0]["covers"][0] = "assessment-evidence-packet"
        self.assertTrue(any("Capstone" in failure for failure in check_lessons(self.curriculum)))

    def test_extension_tier_and_module_limits_are_checked(self):
        self.curriculum["lessons"][0]["tier"] = "extension"
        self.curriculum["lessons"] = self.curriculum["lessons"][:1]
        failures = check_lessons(self.curriculum)
        self.assertTrue(any("tier mismatch" in failure for failure in failures))
        self.assertTrue(any("3-8" in failure for failure in failures))

    def test_cycle_is_rejected_even_for_supporting_edges(self):
        self.assertEqual([], find_cycles(["first", "second"], [("first", "second")]))
        self.assertTrue(find_cycles(["first", "second"], [("first", "second"), ("second", "first")]))
        self.curriculum["edges"].append({"parent": "gpai-model", "child": "ai-system", "kind": "suggests", "reason": "A proposed loop"})
        self.assertTrue(any("Cycle" in failure for failure in check_edges(self.curriculum)))

    def test_extension_cannot_gate_core(self):
        self.curriculum["edges"].append({"parent": "classification-guidance", "child": "credit-use", "kind": "requires", "reason": "Invalid extension gate"})
        self.assertTrue(any("Extension gates core" in failure for failure in check_edges(self.curriculum)))

    def test_map_cannot_be_gated_and_required_order_is_checked(self):
        self.curriculum["edges"].append({"parent": "ai-system", "child": "ai-act-map", "kind": "requires", "reason": "Invalid map gate"})
        failures = check_edges(self.curriculum)
        self.assertTrue(any("Map must be ungated" in failure for failure in failures))
        self.assertTrue(any("taught earlier" in failure for failure in failures))

    def test_unknown_edge_and_missing_reason_are_rejected(self):
        self.curriculum["edges"].append({"parent": "unknown", "child": "ai-system", "kind": "requires", "reason": "Unknown reference"})
        self.curriculum["edges"][0]["reason"] = ""
        failures = check_edges(self.curriculum)
        self.assertTrue(any("Unknown edge endpoint" in failure for failure in failures))
        self.assertTrue(any("kind/reason" in failure for failure in failures))

    def test_more_than_four_required_parents_is_rejected(self):
        parents = ["ai-act-map", "risk", "ai-literacy-support", "ai-system", "gpai-model"]
        self.curriculum["edges"] = [edge for edge in self.curriculum["edges"] if edge["child"] != "intended-purpose"]
        self.curriculum["edges"].extend({"parent": parent, "child": "intended-purpose", "kind": "requires", "reason": "Proposed context"} for parent in parents)
        self.assertTrue(any("Too many" in failure for failure in check_edges(self.curriculum)))

    def test_derived_prerequisites_include_only_external_required_links(self):
        expected = derive_prerequisites(self.curriculum)
        self.assertEqual([], expected["I02"])
        self.assertEqual(["I02"], [parent["lesson_id"] for parent in expected["I03"]])
        self.curriculum["lessons"][2]["prerequisites"] = []
        self.assertEqual(["Derived prerequisites differ: I03"], check_prerequisites(self.curriculum))

    def test_all_targeted_provision_rows_are_required(self):
        locators = {f"Annex III({point})" for point in ANNEX_III_POINTS}
        locators |= ARTICLE_5_PROVISIONS | ARTICLE_6_PROVISIONS
        for locator in locators:
            with self.subTest(locator=locator):
                damaged = copy.deepcopy(self.coverage)
                damaged["coverage"] = [entry for entry in damaged["coverage"] if entry["locator"] != locator]
                self.assertIn(f"Missing provision coverage: {locator}", check_coverage(self.curriculum, damaged, self.sources))

    def test_coverage_cannot_claim_taught_or_reference_unknown_lesson(self):
        self.coverage["coverage"][0].update(status="taught", lesson="UNKNOWN")
        failures = check_coverage(self.curriculum, self.coverage, self.sources)
        self.assertTrue(any("overstates" in failure for failure in failures))
        self.assertTrue(any("Unknown coverage" in failure for failure in failures))

    def test_baseline_and_concept_sources_must_match(self):
        self.curriculum["source_baseline"] = "old-version"
        self.curriculum["concepts"][0]["source_ids"] = ["UNKNOWN"]
        self.coverage["baseline"] = "old-version"
        failures = check_coverage(self.curriculum, self.coverage, self.sources)
        self.assertTrue(any("Unknown concept source" in failure for failure in failures))
        self.assertEqual(2, sum("baseline mismatch" in failure for failure in failures))

    def test_retained_source_hash_is_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sources = {"sources": [{"id": "example", "file": "source.pdf", "sha256": "wrong"}]}
            self.assertEqual(["Missing retained source: example"], check_source_files(sources, root))
            (root / "source.pdf").write_bytes(b"changed source")
            self.assertEqual(["Source hash mismatch: example"], check_source_files(sources, root))

    def test_markdown_cells_preserve_table_structure(self):
        self.assertEqual("a\\|b c", markdown_cell("a|b\nc"))
        table = markdown_table(["Header"], [("a|b",)])
        self.assertIn("| a\\|b   |", table)

    def test_rendered_documents_preserve_counts_and_edge_reasons(self):
        concepts = {concept["slug"]: concept for concept in self.curriculum["concepts"]}
        lesson_table = render_lesson_table(self.curriculum["lessons"][:1], concepts)
        self.assertIn("I01", lesson_table)
        graph = render_graph(self.curriculum)
        for edge in self.curriculum["edges"]:
            self.assertIn(markdown_cell(edge["reason"]), graph)
        for entry in self.coverage["coverage"]:
            self.assertIn(markdown_cell(entry["locator"]), render_coverage(self.coverage))
        for source in self.sources["sources"]:
            self.assertIn(source["url"], render_sources(self.sources))
        self.assertIn("52 lessons", render_outline(self.curriculum))

    def test_render_write_and_check_detects_stale_review(self):
        documents = build_documents(self.curriculum, self.coverage, self.sources)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.assertEqual(set(documents), set(write_documents(documents, root, check=True)))
            self.assertEqual([], write_documents(documents, root))
            self.assertEqual([], write_documents(documents, root, check=True))
            (root / "concept-graph.md").write_text("stale")
            self.assertEqual(["concept-graph.md"], write_documents(documents, root, check=True))

    def test_programme_inventory_includes_every_amended_article_and_annex(self):
        root = Path(__file__).resolve().parent
        inventory = json.loads((root / "programme-inventory.json").read_text())
        expected_articles = {f"Article {number}" for number in range(1, 114)}
        expected_articles |= {f"Article {number}" for number in ("4a", "60a", "75a", "75b", "75c", "75d")}
        self.assertEqual(expected_articles, {entry["locator"] for entry in inventory["articles"]})
        self.assertEqual(14, len(inventory["annexes"]))
        self.assertTrue(all(entry["status"] == "scope-planned-not-taught" for entry in inventory["articles"] + inventory["annexes"]))
        self.assertEqual(self.sources["baseline"], inventory["baseline"])

    def test_review_commands_work_end_to_end(self):
        root = Path(__file__).resolve().parent
        for filename, arguments in (("curriculum_validation.py", []), ("render_review.py", ["--check"])):
            completed = subprocess.run([sys.executable, str(root / filename), *arguments], capture_output=True, text=True, check=False)
            self.assertEqual(0, completed.returncode, completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
