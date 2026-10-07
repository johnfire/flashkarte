"""Small authoring constructors; teaching and answers remain explicit in each module."""

from lesson_builder import assessment


def lesson(locator, summary, screens, questions, sources=()):
    return {"locator": locator, "summary": summary, "screens": screens,
            "questions": questions, "additional_sources": list(sources)}


def question(concepts, screens, prompt, retest, right, wrong, other):
    return assessment(concepts, screens, prompt, retest, right, wrong, other)
