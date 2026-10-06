"""Damaged content must fail before a partially authored course reaches learners."""

import copy
import json
import unittest

from lesson_validation import ROOT, check_course, check_lesson, read_fixtures


class LessonValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.curriculum = json.loads((ROOT / "curriculum.json").read_text())
        cls.fixtures = read_fixtures(cls.curriculum)

    def setUp(self):
        self.fixture = copy.deepcopy(self.fixtures[0])

    def test_all_planned_lessons_are_assessed_and_importable_in_order(self):
        self.assertEqual([], check_course(self.curriculum, self.fixtures))
        self.assertEqual(52, len(self.fixtures))

    def test_missing_concept_assessment_is_rejected(self):
        self.fixture["lesson"]["covers"].append("unassessed")
        self.assertTrue(any("not all assessed" in issue for issue in check_lesson(self.fixture)))

    def test_question_cannot_remediate_to_an_unknown_screen(self):
        self.fixture["questions"][0]["teaches"] = ["missing-screen"]
        self.assertTrue(any("teaching screen" in issue for issue in check_lesson(self.fixture)))

    def test_multiple_correct_choices_are_rejected(self):
        for option in self.fixture["questions"][0]["options"]:
            option["correct"] = True
        self.assertTrue(any("exactly one" in issue for issue in check_lesson(self.fixture)))

    def test_missing_retest_and_unexplained_options_are_rejected(self):
        self.fixture["questions"][0]["variants"] = []
        self.fixture["questions"][0]["options"][0]["reason"] = ""
        issues = check_lesson(self.fixture)
        self.assertTrue(any("equivalent retest" in issue for issue in issues))
        self.assertTrue(any("explanation required" in issue for issue in issues))

    def test_retest_cannot_change_the_correct_answer(self):
        variant = self.fixture["questions"][0]["variants"][0]
        for position, option in enumerate(variant["options"]):
            option["correct"] = position == 0
        self.assertTrue(any("changes the answer" in issue for issue in check_lesson(self.fixture)))

    def test_source_and_unique_screen_reference_are_required(self):
        self.fixture["screens"][0]["sources"] = []
        self.fixture["screens"][1]["ref"] = self.fixture["screens"][0]["ref"]
        issues = check_lesson(self.fixture)
        self.assertTrue(any("sources required" in issue for issue in issues))
        self.assertTrue(any("duplicate screen" in issue for issue in issues))

    def test_missing_prerequisite_and_generator_drift_are_rejected(self):
        fixtures = copy.deepcopy(self.fixtures)
        fixtures[0]["lesson"]["prerequisites"] = [{"lesson": "not-authored", "reason": "Broken"}]
        issues = check_course(self.curriculum, fixtures)
        self.assertTrue(any("not imported earlier" in issue for issue in issues))
        self.assertTrue(any("differ from" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
