"""Checks for the complete English Article 50 release and assessment evidence."""

import copy
import unittest

from article_50_lessons import build_article_50_graph, check_article_50_graph, read_article_50_fixtures
from article_50_validation import read_article_50_package
from lesson_builder import build_course
from lesson_validation import check_course


class Article50LessonTests(unittest.TestCase):
    def setUp(self):
        self.curriculum, _ = read_article_50_package()
        self.fixtures = read_article_50_fixtures(self.curriculum)

    def test_complete_release_matches_authored_sources(self):
        self.assertEqual(check_course(self.curriculum, self.fixtures), [])
        self.assertEqual(self.fixtures, build_course(self.curriculum))
        self.assertEqual(len(self.fixtures), 18)

    def test_import_graph_cannot_drift_from_approved_edges(self):
        graph = build_article_50_graph(self.curriculum)
        self.assertEqual(check_article_50_graph(self.curriculum, graph), [])
        graph["edges"][0]["reason"] = "Unsupported dependency"
        self.assertTrue(check_article_50_graph(self.curriculum, graph))

    def test_changed_editorial_answer_is_rejected(self):
        question = self.fixtures[16]["questions"][0]
        question["options"][0]["correct"] = not question["options"][0]["correct"]
        self.assertTrue(check_course(self.curriculum, self.fixtures))

    def test_missing_remediation_screen_is_rejected(self):
        self.fixtures[17]["questions"][0]["teaches"] = ["screen-unknown"]
        self.assertTrue(any("teaching screen" in failure
                            for failure in check_course(self.curriculum, self.fixtures)))

    def test_retest_cannot_change_correct_answer(self):
        variant = self.fixtures[14]["questions"][0]["variants"][0]
        correct = next(option for option in variant["options"] if option["correct"])
        correct["blocks"] = "Creative purpose removes all disclosure"
        self.assertTrue(any("changes the answer" in failure
                            for failure in check_course(self.curriculum, self.fixtures)))

    def test_coverage_cannot_hide_an_unassessed_concept(self):
        self.fixtures[12]["questions"] = copy.deepcopy(self.fixtures[12]["questions"][:2])
        self.assertTrue(any("not all assessed" in failure
                            for failure in check_course(self.curriculum, self.fixtures)))


if __name__ == "__main__":
    unittest.main()
