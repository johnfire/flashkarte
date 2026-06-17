"""Parity check against the shared cross-port corpus (fixtures/parser-cases.json).

The TS port (packages/shared/src/markdown/parser.corpus.test.ts) runs the same
cases; both must agree. Scope is the common feature set — the Python reference
parser does not implement branching, so those cases live only in the TS/Kotlin
suites.
"""

import json
from pathlib import Path

import pytest

from flashmd.parser.md_parser import parse

_CORPUS = json.loads(
    (Path(__file__).resolve().parents[3] / "fixtures" / "parser-cases.json").read_text()
)
_CASES = _CORPUS["cases"]


@pytest.mark.parametrize("case", _CASES, ids=[c["name"] for c in _CASES])
def test_parser_matches_shared_corpus(case):
    deck = parse(case["input"], case["source"])
    expected = case["expected"]
    assert deck.title == expected["title"]
    got = [
        {"front": c.front, "back": c.back, "category": c.category}
        for c in deck.cards
    ]
    assert got == expected["cards"]
