import pytest
from datetime import date, timedelta

from flashmd.db import deck_repo, card_repo, progress_repo
from flashmd.db.import_service import import_deck
from flashmd.parser.md_parser import parse


# ── Deck repo ─────────────────────────────────────────────────────────────────

def test_insert_and_get_deck(conn):
    deck_id = deck_repo.insert(conn, "My Deck", "my.md")
    row = deck_repo.get_by_id(conn, deck_id)
    assert row["title"] == "My Deck"
    assert row["source_file"] == "my.md"


def test_get_all_decks(conn):
    deck_repo.insert(conn, "Alpha", "a.md")
    deck_repo.insert(conn, "Beta", "b.md")
    rows = deck_repo.get_all(conn)
    assert len(rows) == 2


def test_get_deck_by_title(conn):
    deck_repo.insert(conn, "Findable", "f.md")
    row = deck_repo.get_by_title(conn, "Findable")
    assert row is not None
    row_none = deck_repo.get_by_title(conn, "Missing")
    assert row_none is None


def test_delete_deck_cascades(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    deck_repo.delete(conn, deck_id)
    conn.commit()
    cards = card_repo.get_cards(conn, deck_id)
    assert len(cards) == 0


# ── Import service ────────────────────────────────────────────────────────────

def test_import_creates_deck_and_cards(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    cards = card_repo.get_cards(conn, deck_id)
    assert len(cards) == 3


def test_import_creates_progress_for_all_cards(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    cards = card_repo.get_cards(conn, deck_id)
    for card in cards:
        prog = progress_repo.get_progress(conn, card["id"])
        assert prog is not None
        assert prog["easiness"] == 2.5
        assert prog["repetitions"] == 0


def test_import_due_date_is_tomorrow(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    cards = card_repo.get_cards(conn, deck_id)
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    for card in cards:
        prog = progress_repo.get_progress(conn, card["id"])
        assert prog["due_date"] == tomorrow


def test_reimport_unchanged_preserves_progress(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    # manually apply a rating
    cards = card_repo.get_cards(conn, deck_id)
    card_id = cards[0]["id"]
    progress_repo.apply_rating(conn, card_id, 5)
    conn.commit()
    prog_before = progress_repo.get_progress(conn, card_id)

    # reimport same deck
    import_deck(conn, parsed_deck)
    prog_after = progress_repo.get_progress(conn, card_id)
    assert prog_after["easiness"] == prog_before["easiness"]
    assert prog_after["interval"] == prog_before["interval"]


def test_reimport_changed_back_resets_progress(conn):
    md1 = "# Deck\n\n**1. FOO — Foo**\nOriginal back.\n"
    md2 = "# Deck\n\n**1. FOO — Foo**\nChanged back.\n"

    deck_id = import_deck(conn, parse(md1, "d.md"))
    cards = card_repo.get_cards(conn, deck_id)
    card_id = cards[0]["id"]
    progress_repo.apply_rating(conn, card_id, 5)
    conn.commit()

    import_deck(conn, parse(md2, "d.md"))
    prog = progress_repo.get_progress(conn, card_id)
    assert prog["repetitions"] == 0
    assert prog["easiness"] == 2.5


def test_reimport_removes_deleted_cards(conn):
    md1 = "# Deck\n\n**1. FOO — Foo**\nFoo.\n\n**2. BAR — Bar**\nBar.\n"
    md2 = "# Deck\n\n**1. FOO — Foo**\nFoo.\n"

    deck_id = import_deck(conn, parse(md1, "d.md"))
    assert len(card_repo.get_cards(conn, deck_id)) == 2

    import_deck(conn, parse(md2, "d.md"))
    assert len(card_repo.get_cards(conn, deck_id)) == 1


# ── Progress repo ─────────────────────────────────────────────────────────────

def test_apply_rating_updates_progress(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    cards = card_repo.get_cards(conn, deck_id)
    card_id = cards[0]["id"]

    progress_repo.apply_rating(conn, card_id, 4)
    conn.commit()
    prog = progress_repo.get_progress(conn, card_id)
    assert prog["repetitions"] == 1
    assert prog["interval"] == 1
    assert prog["last_rating"] == 4


def test_get_due_cards_empty_when_all_due_tomorrow(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    due = progress_repo.get_due_cards(conn, deck_id)
    assert len(due) == 0  # all set to tomorrow


def test_get_stats(conn, parsed_deck):
    deck_id = import_deck(conn, parsed_deck)
    stats = progress_repo.get_stats(conn, deck_id)
    assert stats["total"] == 3
    assert stats["due"] == 0
