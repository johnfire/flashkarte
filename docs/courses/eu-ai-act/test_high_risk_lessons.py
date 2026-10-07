"""Regression checks for the approved course and its learning-path boundaries."""
import copy
import json
import unittest

from high_risk_lessons import ROOT, read_approved_plan, validate
from lesson_builder import build_course
from lesson_validation import check_lesson


class HighRiskCourseTests(unittest.TestCase):
    def setUp(self):
        self.plan = read_approved_plan()
        self.fixtures = build_course(self.plan)

    def test_complete_reviewed_course_and_persisted_content(self):
        self.assertEqual(validate(self.plan, self.fixtures), [])
        self.assertEqual((len(self.plan['concepts']), len(self.fixtures)), (78, 30))
        self.assertEqual(len(self.plan['modules']), 5)
        for fixture in self.fixtures:
            saved = json.loads((ROOT / 'lessons' / 'en' / f"{fixture['lesson']['slug']}.json").read_text())
            self.assertEqual(saved, fixture)

    def test_optional_biometrics_cannot_lock_the_core_path(self):
        self.assertEqual({c['slug'] for c in self.plan['concepts'] if c['tier'] == 'extension'},
                         {'post-remote-biometric-route', 'biometric-dual-verification', 'biometric-log-fields'})
        for fixture in self.fixtures:
            self.assertNotIn('h29', {p['lesson'] for p in fixture['lesson']['prerequisites']})

    def test_core_cannot_require_an_extension(self):
        changed = copy.deepcopy(self.plan)
        changed['edges'].append({'parent': 'post-remote-biometric-route', 'child': 'compliance-decision-case',
                                 'kind': 'requires', 'reason': 'Mutated regression case.'})
        self.assertTrue(any('Extension gates core' in failure for failure in validate(changed, self.fixtures)))

    def test_unassessed_concept_is_rejected(self):
        changed = copy.deepcopy(self.fixtures[0])
        changed['questions'] = [q for q in changed['questions'] if 'eu-connection' not in q['covers']]
        self.assertTrue(any('not all assessed' in failure for failure in check_lesson(changed)))

    def test_missing_remediation_target_is_rejected(self):
        changed = copy.deepcopy(self.fixtures[0])
        changed['questions'][0]['teaches'] = ['missing-screen']
        self.assertTrue(any('teaching screen' in failure for failure in check_lesson(changed)))

    def test_retest_cannot_change_the_correct_answer(self):
        changed = copy.deepcopy(self.fixtures[0])
        for option in changed['questions'][0]['variants'][0]['options']:
            option['correct'] = not option['correct']
        self.assertTrue(check_lesson(changed))

    def test_missing_source_is_rejected(self):
        changed = copy.deepcopy(self.fixtures[0])
        changed['screens'][0]['sources'] = []
        self.assertTrue(any('sources required' in failure for failure in check_lesson(changed)))


if __name__ == '__main__':
    unittest.main()
