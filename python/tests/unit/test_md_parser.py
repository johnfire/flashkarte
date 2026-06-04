import pytest
from flashmd.parser.md_parser import parse, ParsedCard


SAMPLE_MD = """\
# Test Deck
*A subtitle line*

---

## Category One

**1. ALPHA — Alpha Particle**
The first letter of the Greek alphabet.
Used in physics to describe helium nuclei.

**2. BETA — Beta Particle**
An electron or positron emitted during beta decay.

## Category Two

**3. GAMMA — Gamma Ray**
High-energy electromagnetic radiation.

This is a second paragraph of the gamma definition.
"""


def test_deck_title():
    deck = parse(SAMPLE_MD, "test.md")
    assert deck.title == "Test Deck"


def test_source_file():
    deck = parse(SAMPLE_MD, "test.md")
    assert deck.source_file == "test.md"


def test_card_count():
    deck = parse(SAMPLE_MD, "test.md")
    assert len(deck.cards) == 3


def test_card_fronts():
    deck = parse(SAMPLE_MD, "test.md")
    assert deck.cards[0].front == "ALPHA — Alpha Particle"
    assert deck.cards[1].front == "BETA — Beta Particle"
    assert deck.cards[2].front == "GAMMA — Gamma Ray"


def test_card_categories():
    deck = parse(SAMPLE_MD, "test.md")
    assert deck.cards[0].category == "Category One"
    assert deck.cards[1].category == "Category One"
    assert deck.cards[2].category == "Category Two"


def test_single_paragraph_back():
    deck = parse(SAMPLE_MD, "test.md")
    # Multi-line single paragraph joined with space
    assert deck.cards[0].back == (
        "The first letter of the Greek alphabet. "
        "Used in physics to describe helium nuclei."
    )


def test_single_line_back():
    deck = parse(SAMPLE_MD, "test.md")
    assert deck.cards[1].back == "An electron or positron emitted during beta decay."


def test_multi_paragraph_back():
    deck = parse(SAMPLE_MD, "test.md")
    back = deck.cards[2].back
    assert "\n\n" in back
    parts = back.split("\n\n")
    assert len(parts) == 2
    assert parts[0] == "High-energy electromagnetic radiation."
    assert parts[1] == "This is a second paragraph of the gamma definition."


def test_no_cards_returns_empty():
    md = "# Empty Deck\nNo card patterns here.\n"
    deck = parse(md, "empty.md")
    assert deck.title == "Empty Deck"
    assert len(deck.cards) == 0


def test_no_title_falls_back_to_filename():
    md = "**1. FOO — Bar**\nSome definition.\n"
    deck = parse(md, "fallback.md")
    assert deck.title == "fallback.md"
    assert len(deck.cards) == 1


def test_card_without_category():
    md = "# Deck\n\n**1. FOO — Bar**\nDefinition.\n"
    deck = parse(md, "x.md")
    assert deck.cards[0].category is None
