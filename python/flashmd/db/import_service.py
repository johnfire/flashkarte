"""
Orchestrates importing a parsed deck into the database.
Handles both new decks and re-imports (partial progress preservation).
"""
import sqlite3

from flashmd.parser.md_parser import ParsedDeck
from flashmd.db import deck_repo, card_repo, progress_repo


def import_deck(conn: sqlite3.Connection, parsed: ParsedDeck) -> str:
    """
    Insert or update a deck from a ParsedDeck.
    - New deck: insert everything, init progress for all cards.
    - Existing deck: upsert cards, reset progress only for changed/new cards.
    Returns the deck_id.
    """
    existing = deck_repo.get_by_title(conn, parsed.title)

    if existing is None:
        deck_id = deck_repo.insert(conn, parsed.title, parsed.source_file)
        card_map, changed_fronts = card_repo.upsert_deck_contents(conn, deck_id, parsed)
    else:
        deck_id = existing["id"]
        card_map, changed_fronts = card_repo.upsert_deck_contents(conn, deck_id, parsed)

    for front, card_id in card_map.items():
        if front in changed_fronts:
            # New card: init; changed card: reset
            existing_progress = progress_repo.get_progress(conn, card_id)
            if existing_progress is None:
                progress_repo.init_progress(conn, card_id)
            else:
                progress_repo.reset_progress(conn, card_id)

    conn.commit()
    return deck_id
