"""Reject incomplete teaching, stale fixtures and unsourced incorporated-law claims."""

import copy
import json
import subprocess
import sys
import unittest

from conformity_lessons import PLAN_ROOT, graph_import, saved_fixtures, validate
from curriculum_validation import read_package
from lesson_builder import build_course
from lesson_validation import check_lesson


class ConformityLessonTests(unittest.TestCase):
    def setUp(self):
        self.curriculum, self.coverage, self.sources = read_package(PLAN_ROOT)
        self.fixtures = build_course(self.curriculum)

    def test_saved_course_matches_complete_approved_teaching(self):
        self.assertEqual([], validate(self.curriculum, self.coverage, self.sources, self.fixtures))
        self.assertEqual(self.fixtures, saved_fixtures(self.curriculum))
        self.assertEqual((30, 137, 90), (len(self.fixtures), sum(len(f['screens']) for f in self.fixtures),
                                       sum(len(f['questions']) for f in self.fixtures)))
        self.assertEqual(graph_import(self.curriculum), json.loads((PLAN_ROOT / 'subject-import.json').read_text()))

    def test_incorporated_law_and_guidance_are_on_the_relevant_screens(self):
        required = {'f10': 'CRA', 'f11': 'EC-FAQ', 'f24': 'CRA', 'f27': 'CE-GENERAL',
                    'f28': 'EC-REGISTRATION', 'f29': 'EC-REGISTRATION'}
        urls = {source['id']: source['url'] for source in self.sources['sources']}
        for fixture in self.fixtures:
            identifier = fixture['lesson']['slug']
            if identifier in required:
                for screen in fixture['screens']:
                    self.assertIn(urls[required[identifier]], [source['url'] for source in screen['sources']])

    def test_lost_concept_assessment_is_rejected(self):
        changed = copy.deepcopy(self.fixtures[0])
        concept = changed['lesson']['covers'][0]
        for question in changed['questions']:
            question['covers'] = [slug for slug in question['covers'] if slug != concept]
        self.assertTrue(any('not all assessed' in failure for failure in check_lesson(changed)))

    def test_broken_remediation_retest_or_explanation_is_rejected(self):
        for field, replacement, expected in [('teaches', ['unknown-screen'], 'teaching screen'),
                                              ('variants', [], 'retest required')]:
            changed = copy.deepcopy(self.fixtures[0])
            changed['questions'][0][field] = replacement
            self.assertTrue(any(expected in failure for failure in check_lesson(changed)))
        changed['questions'][0]['options'][0]['reason'] = ''
        self.assertTrue(any('explanation required' in failure for failure in check_lesson(changed)))

    def test_retest_cannot_change_its_correct_answer(self):
        changed = copy.deepcopy(self.fixtures[0])
        variant = changed['questions'][0]['variants'][0]
        variant['options'] = copy.deepcopy(variant['options'])
        current = next(index for index, option in enumerate(variant['options']) if option['correct'])
        for index, option in enumerate(variant['options']):
            option['correct'] = index == (current + 1) % len(variant['options'])
        self.assertTrue(any('changes the answer' in failure for failure in check_lesson(changed)))

    def test_missing_source_and_stale_authored_fixture_are_rejected(self):
        changed = copy.deepcopy(self.fixtures)
        changed[0]['screens'][0]['sources'] = []
        failures = validate(self.curriculum, self.coverage, self.sources, changed)
        self.assertTrue(any('sources required' in failure for failure in failures))
        self.assertIn('English fixtures differ from their authored content and curriculum', failures)

    def test_cli_checks_saved_package(self):
        completed = subprocess.run([sys.executable, str(PLAN_ROOT.parent / 'conformity_lessons.py'), '--check'],
                                   capture_output=True, text=True, check=False)
        self.assertEqual(0, completed.returncode, completed.stderr)
        self.assertIn('137 screens, 90 questions with retests', completed.stdout)


if __name__ == '__main__':
    unittest.main()
