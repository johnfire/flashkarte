"""Damage the GDPR course on purpose and check that the validators reject it."""

import copy
import json
import unittest
from pathlib import Path

import curriculum_plan
from curriculum_validation import check_curriculum
from german_validation import check_german, check_language, check_parity, check_quotes
from lesson_builder import build_course, subject_import
from lesson_validation import check_course, check_lesson
from sources import SOURCES, file_name, sha256

ROOT = Path(__file__).resolve().parent


class CurriculumTests(unittest.TestCase):
    def setUp(self):
        self.plan = curriculum_plan.build()

    def test_saved_plan_is_current_and_valid(self):
        self.assertEqual(json.loads((ROOT / "curriculum.json").read_text()), self.plan)
        self.assertEqual(check_curriculum(self.plan), [])

    def test_generated_review_files_are_current(self):
        self.assertEqual((ROOT / "concept-graph.md").read_text(), curriculum_plan.render_graph(self.plan))
        self.assertEqual(json.loads((ROOT / "subject-import.json").read_text()), subject_import(self.plan))

    def test_cycle_is_rejected(self):
        self.plan["edges"].append({"parent": "accountability", "child": "processing", "kind": "requires", "reason": "loop"})
        self.assertTrue(any("cycle" in failure for failure in check_curriculum(self.plan)))

    def test_requires_edge_needs_a_reason(self):
        self.plan["edges"][0]["reason"] = " "
        self.assertTrue(check_curriculum(self.plan))

    def test_core_concept_cannot_require_an_extension(self):
        self.plan["edges"].append({"parent": "cookie-consent-rule", "child": "lawful-bases", "kind": "requires", "reason": "x"})
        self.assertTrue(any("requires extension" in failure for failure in check_curriculum(self.plan)))

    def test_no_core_lesson_depends_on_an_extension_lesson(self):
        tiers = {lesson["id"]: lesson["tier"] for lesson in self.plan["lessons"]}
        for lesson in self.plan["lessons"]:
            if lesson["tier"] == "core":
                for prerequisite in lesson["prerequisites"]:
                    self.assertEqual(tiers[prerequisite["lesson_id"]], "core", lesson["id"])


class LessonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.curriculum = curriculum_plan.build()
        cls.fixtures = build_course(cls.curriculum)

    def lesson(self):
        return copy.deepcopy(self.fixtures[1])

    def test_saved_fixtures_are_current_and_valid(self):
        saved = [json.loads((ROOT / "lessons" / "en" / f"{lesson['id'].lower()}.json").read_text())
                 for lesson in self.curriculum["lessons"]]
        self.assertEqual(check_course(self.curriculum, saved), [])

    def test_missing_retest_is_rejected(self):
        fixture = self.lesson()
        fixture["questions"][0]["variants"] = []
        self.assertTrue(check_lesson(fixture))

    def test_retest_must_be_reworded(self):
        fixture = self.lesson()
        fixture["questions"][0]["variants"][0]["prompt"] = fixture["questions"][0]["prompt"]
        self.assertTrue(check_lesson(fixture))

    def test_unknown_teaching_screen_is_rejected(self):
        fixture = self.lesson()
        fixture["questions"][0]["teaches"] = ["screen-99"]
        self.assertTrue(check_lesson(fixture))

    def test_two_correct_options_are_rejected(self):
        fixture = self.lesson()
        for option in fixture["questions"][0]["options"]:
            option["correct"] = True
        self.assertTrue(check_lesson(fixture))

    def test_unassessed_concept_is_rejected(self):
        fixture = self.lesson()
        fixture["questions"] = [q for q in fixture["questions"] if fixture["lesson"]["covers"][0] not in q["covers"]]
        self.assertTrue(check_lesson(fixture))

    def test_screen_without_source_is_rejected(self):
        fixture = self.lesson()
        fixture["screens"][0]["sources"] = []
        self.assertTrue(check_lesson(fixture))

    def test_prerequisite_must_be_imported_first(self):
        fixtures = copy.deepcopy(self.fixtures)
        fixtures[0], fixtures[2] = fixtures[2], fixtures[0]
        self.assertTrue(check_course(self.curriculum, fixtures))

    def test_first_screen_of_course_states_it_is_not_legal_advice(self):
        text = json.dumps(self.fixtures[0]["screens"])
        self.assertIn("not legal advice", text)


class GermanTests(unittest.TestCase):
    """G01 is the reference translation; damage it and check that the German checks reject the damage."""

    @classmethod
    def setUpClass(cls):
        curriculum = curriculum_plan.build()
        cls.english = build_course(curriculum, "en")[0]
        cls.german = build_course(curriculum, "de", {"M0"}, partial=True)[0]

    def lesson(self):
        return copy.deepcopy(self.german)

    def test_saved_german_edition_is_current_and_valid(self):
        failures, german = check_german(curriculum_plan.build())
        self.assertEqual(failures, [])
        self.assertEqual(len(german), 40)

    def test_reference_lesson_passes(self):
        self.assertEqual(check_lesson(self.german), [])
        self.assertEqual(check_parity(self.english, self.german), [])
        self.assertEqual(check_quotes(self.german), [])
        self.assertEqual(check_language(self.german), [])

    def test_invented_quotation_is_rejected(self):
        fixture = self.lesson()
        fixture["screens"][0]["blocks"][0] += " Die DSGVO sagt „Daten gehören immer dem Unternehmen“."
        self.assertTrue(check_quotes(fixture))

    def test_straight_quotes_are_rejected(self):
        fixture = self.lesson()
        fixture["questions"][0]["prompt"] = 'Was heißt "Verordnung"?'
        self.assertTrue(check_quotes(fixture))

    def test_english_leftover_is_rejected(self):
        fixture = self.lesson()
        fixture["questions"][0]["options"][0]["reason"] = "Article 1 protects the data subject."
        self.assertTrue(check_language(fixture))

    def test_informal_address_is_rejected(self):
        fixture = self.lesson()
        fixture["screens"][2]["blocks"][1] = "Du kannst jede Aussage prüfen."
        self.assertTrue(check_language(fixture))

    def test_english_source_link_is_rejected(self):
        fixture = self.lesson()
        fixture["screens"][0]["sources"][0]["url"] = self.english["screens"][0]["sources"][0]["url"]
        self.assertTrue(check_language(fixture))

    def test_missing_screen_is_rejected(self):
        fixture = self.lesson()
        fixture["screens"].pop()
        self.assertTrue(check_parity(self.english, fixture))

    def test_changed_block_structure_is_rejected(self):
        fixture = self.lesson()
        fixture["screens"][5]["blocks"][1]["items"].pop()
        self.assertTrue(check_parity(self.english, fixture))

    def test_moved_correct_answer_is_rejected(self):
        fixture = self.lesson()
        options = fixture["questions"][0]["options"]
        options[0], options[1] = options[1], options[0]
        self.assertTrue(check_parity(self.english, fixture))

    def test_first_screen_states_it_is_not_legal_advice(self):
        self.assertIn("keine Rechtsberatung", json.dumps(self.german["screens"], ensure_ascii=False))


class SourceTests(unittest.TestCase):
    def test_every_retained_source_exists_and_is_hashed_in_the_register(self):
        register = (ROOT / "source-register.md").read_text()
        for source_id in SOURCES:
            self.assertIn(sha256(source_id), register, source_id)
            self.assertIn(sha256(source_id, "de"), register, source_id)

    def test_no_retained_source_is_an_empty_eur_lex_page(self):
        for source_id in SOURCES:
            for locale in ("en", "de"):
                path = ROOT / "sources" / file_name(source_id, locale)
                if path.suffix == ".html":
                    self.assertNotIn("The requested document does not exist", path.read_text(errors="replace"), path.name)
                    self.assertGreater(path.stat().st_size, 50_000, path.name)


if __name__ == "__main__":
    unittest.main()
